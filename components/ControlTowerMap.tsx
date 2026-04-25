'use client';

import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

interface ShipmentCoordinate {
  lat: number;
  lng: number;
}

export interface Shipment {
  id: string;
  _id?: string;
  shipmentId?: string;
  origin?: {
    type?: 'WAREHOUSE' | 'VENDOR' | 'ADDRESS';
    warehouseId?: string | null;
    vendorId?: string | null;
    address?: string | null;
  };
  destination?: {
    type?: 'WAREHOUSE' | 'ADDRESS';
    warehouseId?: string | null;
    address?: string | null;
  };
  currentLat?: number;
  currentLng?: number;
  riskScore?: number;
  routeGeometry?: ShipmentCoordinate[];
}

interface ControlTowerMapProps {
  onShipmentClick: (shipment: Shipment) => void;
  highlightedShipmentId?: string;
}

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };
const MAP_ZOOM = 5;
const POLL_INTERVAL_MS = 30_000;
const MAP_LOAD_TIMEOUT_MS = 15_000;

const mapsApiKey =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';

// Module-level loader promise — shared across re-renders and StrictMode double-invocations
let mapsLoaderPromise: Promise<void> | null = null;
// Module-level flag so StrictMode's second effect knows initialization already ran
let mapsInitialized = false;

const getMarkerColor = (riskScore: number): string => {
  if (riskScore >= 65) return '#EF4444';
  if (riskScore >= 40) return '#F59E0B';
  return '#10B981';
};

const getRouteSummary = (shipment: Shipment): string => {
  const origin = shipment.origin?.warehouseId || shipment.origin?.address || 'Unknown Origin';
  const destination = shipment.destination?.warehouseId || shipment.destination?.address || 'Unknown Destination';
  return `${origin} → ${destination}`;
};

export default function ControlTowerMap({ onShipmentClick, highlightedShipmentId }: ControlTowerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  const [shipments, setShipments] = useState<Shipment[]>([]);
  // KEY FIX: Start loading=false. Set to true only during the async init window.
  // This prevents the StrictMode double-invoke from leaving loading permanently true.
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(mapsInitialized); // immediately true if already loaded
  const [mapError, setMapError] = useState<string | null>(null);

  const activeMapShipments = useMemo(
    () => shipments.filter((s) => typeof s.currentLat === 'number' && typeof s.currentLng === 'number'),
    [shipments]
  );

  // --- Map Initialization Effect ---
  useEffect(() => {
    // If the map was already initialized in a previous mount (StrictMode or page revisit), skip
    if (mapsInitialized && mapRef.current) {
      setLoading(false);
      return;
    }

    // If already initialized globally but mapRef is empty (StrictMode second mount),
    // re-attach to the DOM container
    if (mapsInitialized && containerRef.current && !mapRef.current) {
      try {
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: INDIA_CENTER,
          zoom: MAP_ZOOM,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        });
        infoWindowRef.current = new google.maps.InfoWindow();
        setMapReady(true);
        setLoading(false);
      } catch {
        setLoading(false);
      }
      return;
    }

    let cancelled = false;

    const initializeMap = async () => {
      if (!mapsApiKey) {
        setMapError(
          'Google Maps key missing. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env and restart the dev server.'
        );
        setLoading(false);
        return;
      }

      setLoading(true);

      const windowWithMapsAuth = window as Window & { gm_authFailure?: () => void };
      const previousAuthFailure = windowWithMapsAuth.gm_authFailure;
      windowWithMapsAuth.gm_authFailure = () => {
        setMapError(
          'Google Maps authentication failed. Check API key restrictions (HTTP referrers), billing status, and Maps JavaScript API enablement in Google Cloud Console.'
        );
        setLoading(false);
        if (typeof previousAuthFailure === 'function') previousAuthFailure();
      };

      try {
        // Build the loader promise only once across all mounts
        if (!mapsLoaderPromise) {
          setOptions({ key: mapsApiKey, v: 'weekly' });

          const loadPromise = Promise.all([
            importLibrary('maps'),
            importLibrary('marker')
          ]).then(() => undefined);

          const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(() => {
              reject(new Error(
                'Google Maps timed out after 15s. Check API key restrictions and billing in Google Cloud Console.'
              ));
            }, MAP_LOAD_TIMEOUT_MS);
          });

          mapsLoaderPromise = Promise.race([loadPromise, timeoutPromise]);
        }

        await mapsLoaderPromise;

        // Bail out if this effect was cleaned up (StrictMode) before the promise resolved
        if (cancelled || !containerRef.current) {
          setLoading(false);
          return;
        }

        mapRef.current = new google.maps.Map(containerRef.current, {
          center: INDIA_CENTER,
          zoom: MAP_ZOOM,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        });
        infoWindowRef.current = new google.maps.InfoWindow({ disableAutoPan: true });
        // Close InfoWindow when clicking bare map so it never stays open blank
        mapRef.current.addListener('click', () => infoWindowRef.current?.close());
        mapsInitialized = true;
        setMapError(null);
        setMapReady(true);
      } catch (error: any) {
        if (!cancelled) {
          setMapError(error?.message || 'Failed to initialize Google Maps.');
          // Reset loader promise so retry is possible
          mapsLoaderPromise = null;
        }
      } finally {
        // Always clear loading, regardless of cancelled state
        // so StrictMode cleanup doesn't leave a permanent spinner
        setLoading(false);
      }
    };

    initializeMap();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Shipment Polling Effect ---
  useEffect(() => {
    let mounted = true;

    const fetchShipments = async () => {
      try {
        const response = await fetch('/api/shipments?status=IN_TRANSIT');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (mounted) {
          setShipments(Array.isArray(payload) ? payload : []);
        }
      } catch (error: any) {
        if (mounted) {
          console.warn('[ControlTowerMap] Shipment fetch failed:', error?.message);
        }
      }
    };

    fetchShipments();
    const intervalId = window.setInterval(fetchShipments, POLL_INTERVAL_MS);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  // --- Marker + Polyline Sync Effect ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    polylinesRef.current.forEach((polyline) => polyline.setMap(null));
    markersRef.current = [];
    polylinesRef.current = [];

    activeMapShipments.forEach((shipment) => {
      const markerColor = getMarkerColor(shipment.riskScore || 0);

      const marker = new google.maps.Marker({
        map,
        position: { lat: shipment.currentLat as number, lng: shipment.currentLng as number },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: markerColor,
          fillOpacity: 1,
          strokeColor: '#111827',
          strokeOpacity: 1,
          strokeWeight: shipment.id === highlightedShipmentId ? 2 : 1,
          scale: shipment.id === highlightedShipmentId ? 8 : 6
        }
      });

      marker.addListener('click', () => onShipmentClick(shipment));
      marker.addListener('mouseover', () => {
        if (!infoWindowRef.current) return;
        const riskColor = markerColor;
        const riskLabel = (shipment.riskScore ?? 0) >= 65 ? 'HIGH' : (shipment.riskScore ?? 0) >= 40 ? 'MED' : 'LOW';
        // Explicit inline styles override any dark-mode global CSS that bleeds into InfoWindow
        infoWindowRef.current.setContent(
          `<div style="font-family:Inter,system-ui,sans-serif;font-size:12px;line-height:1.5;color:#111827;min-width:160px;padding:2px 0;">
            <div style="font-weight:700;font-size:13px;color:#111827;margin-bottom:4px;">${shipment.shipmentId || shipment.id}</div>
            <div style="color:#374151;margin-bottom:6px;">${getRouteSummary(shipment)}</div>
            <div style="display:inline-flex;align-items:center;gap:6px;background:${riskColor}18;border:1px solid ${riskColor}44;border-radius:4px;padding:2px 8px;">
              <span style="width:8px;height:8px;border-radius:50%;background:${riskColor};display:inline-block;flex-shrink:0;"></span>
              <span style="font-weight:700;color:${riskColor};font-size:11px;">${riskLabel} RISK — ${shipment.riskScore ?? 0}%</span>
            </div>
          </div>`
        );
        infoWindowRef.current.open({ anchor: marker, map });
      });
      marker.addListener('mouseout', () => infoWindowRef.current?.close());
      markersRef.current.push(marker);


      if (Array.isArray(shipment.routeGeometry) && shipment.routeGeometry.length > 1) {
        const polyline = new google.maps.Polyline({
          path: shipment.routeGeometry,
          geodesic: true,
          strokeColor: markerColor,
          strokeOpacity: 0.75,
          strokeWeight: 3,
          map
        });
        polylinesRef.current.push(polyline);
      }
    });

    if (activeMapShipments.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      activeMapShipments.forEach((s) =>
        bounds.extend({ lat: s.currentLat as number, lng: s.currentLng as number })
      );
      map.fitBounds(bounds, 64);
    } else {
      map.setCenter(INDIA_CENTER);
      map.setZoom(MAP_ZOOM);
    }
  }, [activeMapShipments, highlightedShipmentId, onShipmentClick, mapReady]);

  // --- Cleanup on Unmount ---
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      polylinesRef.current.forEach((p) => p.setMap(null));
      infoWindowRef.current?.close();
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl border border-black/10 shadow-lg dark:border-white/10">
      <div ref={containerRef} className="h-[420px] w-full" />

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/80 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading control tower map...</p>
        </div>
      )}

      {!loading && mapError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-500/10 p-6 text-center">
          <p className="text-sm font-semibold text-red-500">Map unavailable</p>
          <p className="text-xs text-red-400">{mapError}</p>
        </div>
      )}

      {!loading && !mapError && mapReady && activeMapShipments.length === 0 && (
        <div className="absolute left-3 right-3 top-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs font-medium text-amber-700 dark:text-amber-300">
          No in-transit shipments. Dispatch a shipment to see live markers.
        </div>
      )}
    </div>
  );
}
