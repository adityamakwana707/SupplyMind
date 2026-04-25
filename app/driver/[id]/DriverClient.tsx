'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  Navigation, 
  Coffee, 
  CheckCircle2,
  Navigation2,
  Radio
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { doc, getDoc } from 'firebase/firestore';

interface Shipment {
  id: string;
  shipmentId?: string;
  origin: any;
  destination: any;
  status: string;
  eta: string;
  riskScore: number;
  currentLat?: number;
  currentLng?: number;
  customsStatus?: string;
  cargo?: Array<{ productId: string; quantity: number }>;
  transportPartnerId?: string | null;
  routeGeometry?: Array<{ lat: number; lng: number }>;
  updatedAt?: string;
  rerouteNotification?: {
    newEta?: string;
    notifiedAt?: string;
  };
}

export default function DriverClient({ shipmentId }: { shipmentId: string }) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [lastPing, setLastPing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [originName, setOriginName] = useState<string>('Loading origin...');
  const [destinationName, setDestinationName] = useState<string>('Loading destination...');
  const [cargoSummary, setCargoSummary] = useState<string>('Loading cargo...');
  const [hosHours, setHosHours] = useState<number>(0);
  const [restLoading, setRestLoading] = useState(false);
  const [rerouteBanner, setRerouteBanner] = useState<string | null>(null);
  const [lastRouteFingerprint, setLastRouteFingerprint] = useState<string | null>(null);

  const resolveNodeName = useCallback(async (node: any): Promise<string> => {
    if (!node?.type) return 'Unknown';
    if (node.type === 'ADDRESS') return node.address || 'Unknown Address';
    if (node.type === 'WAREHOUSE') {
      const warehouseId = node.warehouseId || node.id;
      if (!warehouseId) return 'Unknown Warehouse';
      const warehouseDoc = await getDoc(doc(db, 'warehouses', warehouseId));
      return warehouseDoc.exists() ? ((warehouseDoc.data() as any).name || 'Unknown Warehouse') : 'Unknown Warehouse';
    }
    if (node.type === 'VENDOR') {
      const vendorId = node.vendorId || node.id;
      if (!vendorId) return 'Unknown Vendor';
      const vendorDoc = await getDoc(doc(db, 'vendors', vendorId));
      if (!vendorDoc.exists()) return 'Unknown Vendor';
      const vendorData = vendorDoc.data() as any;
      return vendorData.name || vendorData.vendorName || 'Unknown Vendor';
    }
    return 'Unknown';
  }, []);

  const resolveCargoSummary = useCallback(async (currentShipment: Shipment): Promise<string> => {
    const lines = currentShipment.cargo || [];
    if (!lines.length) return 'No cargo details available';

    const productIds = Array.from(new Set(lines.map((line) => line.productId).filter(Boolean)));
    const productNames: string[] = [];
    for (const productId of productIds) {
      const productDoc = await getDoc(doc(db, 'products', productId));
      if (productDoc.exists()) {
        productNames.push(((productDoc.data() as any).name || productId) as string);
      } else {
        productNames.push(productId);
      }
    }

    const totalQuantity = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
    return `${totalQuantity} units — ${productNames.join(', ')}`;
  }, []);

  const fetchPartnerHOS = useCallback(async (partnerId: string | null | undefined) => {
    if (!partnerId) {
      setHosHours(0);
      return;
    }
    const partnerDoc = await getDoc(doc(db, 'transportPartners', partnerId));
    if (!partnerDoc.exists()) {
      setHosHours(0);
      return;
    }
    const partner = partnerDoc.data() as any;
    setHosHours(Number(partner.hoursLoggedToday || 0));
  }, []);

  const routeFingerprint = (currentShipment: Shipment): string => {
    const path = JSON.stringify(currentShipment.routeGeometry || []);
    return `${currentShipment.updatedAt || ''}-${path}`;
  };

  const fetchShipment = useCallback(async () => {
    try {
      const res = await fetch(`/api/shipments/${shipmentId}`);
      if (res.ok) {
        const data = (await res.json()) as Shipment;
        setShipment(data);

        const [resolvedOrigin, resolvedDestination, summary] = await Promise.all([
          resolveNodeName(data.origin),
          resolveNodeName(data.destination),
          resolveCargoSummary(data)
        ]);
        setOriginName(resolvedOrigin);
        setDestinationName(resolvedDestination);
        setCargoSummary(summary);
        await fetchPartnerHOS(data.transportPartnerId);

        const nextFingerprint = routeFingerprint(data);
        if (lastRouteFingerprint && nextFingerprint !== lastRouteFingerprint) {
          const etaText = data.rerouteNotification?.newEta || data.eta;
          setRerouteBanner(`Route updated by dispatch — new ETA ${new Date(etaText).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        }
        setLastRouteFingerprint(nextFingerprint);
      }
    } catch (err) {
      setError('Failed to load shipment details.');
    } finally {
      setLoading(false);
    }
  }, [shipmentId, resolveNodeName, resolveCargoSummary, fetchPartnerHOS, lastRouteFingerprint]);

  useEffect(() => {
    const loadShipmentFromFirestore = async () => {
      try {
        const shipmentDoc = await getDoc(doc(db, 'shipments', shipmentId));
        if (shipmentDoc.exists()) {
          const firestoreShipment = { id: shipmentDoc.id, ...shipmentDoc.data() } as Shipment;
          setShipment(firestoreShipment);
          const [resolvedOrigin, resolvedDestination, summary] = await Promise.all([
            resolveNodeName(firestoreShipment.origin),
            resolveNodeName(firestoreShipment.destination),
            resolveCargoSummary(firestoreShipment)
          ]);
          setOriginName(resolvedOrigin);
          setDestinationName(resolvedDestination);
          setCargoSummary(summary);
          await fetchPartnerHOS(firestoreShipment.transportPartnerId);
          setLastRouteFingerprint(routeFingerprint(firestoreShipment));
        } else {
          setError('Shipment not found.');
        }
      } catch {
        setError('Failed to load shipment from Firestore.');
      } finally {
        setLoading(false);
      }
    };

    loadShipmentFromFirestore();
    fetchShipment();
    const interval = setInterval(fetchShipment, 30000);
    return () => clearInterval(interval);
  }, [fetchShipment, fetchPartnerHOS, resolveCargoSummary, resolveNodeName, shipmentId]);

  // GPS Tracking Logic
  useEffect(() => {
    let watchId: number;
    let intervalId: number;

    if (isTracking && !isResting) {
      if ('geolocation' in navigator) {
        let latestPos: GeolocationPosition | null = null;

        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            latestPos = pos;
            setError(null);
          },
          (err) => {
            setError('GPS Permission Denied. Please enable location services.');
            setIsTracking(false);
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );

        intervalId = window.setInterval(async () => {
          if (!latestPos) return;
          const { latitude, longitude, speed, heading } = latestPos.coords;
          try {
            await fetch(`/api/shipments/${shipmentId}/location`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lat: latitude,
                lng: longitude,
                speed: speed || 0,
                heading: heading || 0,
                timestamp: new Date().toISOString()
              })
            });
            setLastPing(new Date().toLocaleTimeString());
          } catch (err) {
            setError('Location ping failed.');
          }
        }, 30000); // Ping every 30s as per PRD
      } else {
        setError('Geolocation is not supported by this browser.');
        setIsTracking(false);
      }
    }
    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [isTracking, isResting, shipmentId]);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500">
      <div className="flex flex-col items-center gap-4">
        <Radio className="w-12 h-12 animate-pulse" />
        <p className="font-black tracking-widest text-xs uppercase">Connecting to Control Tower...</p>
      </div>
    </div>
  );

  if (!shipment) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-500 p-6 text-center">
      <div>
        <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold uppercase mb-2">Shipment Not Found</h2>
        <p className="text-sm opacity-60">Invalid or expired tracking link. Please contact dispatcher.</p>
      </div>
    </div>
  );

  const hosAlert =
    hosHours >= 8
      ? 'Rest required in 1 hour'
      : hosHours >= 7
      ? '2 hours remaining'
      : null;

  const handleLogRestStop = async () => {
    if (!shipment.transportPartnerId) {
      setError('No transport partner is linked to this shipment.');
      return;
    }

    setRestLoading(true);
    try {
      const res = await fetch(`/api/transport-partners/${shipment.transportPartnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hoursLoggedToday: 0,
          lastRestAt: new Date().toISOString(),
          status: 'AVAILABLE'
        })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Failed to log rest stop.' }));
        throw new Error(body.error || 'Failed to log rest stop.');
      }
      setHosHours(0);
    } catch (err: any) {
      setError(err.message || 'Failed to log rest stop.');
    } finally {
      setRestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {rerouteBanner && (
        <div className="bg-amber-500 text-black font-black text-xs uppercase tracking-widest px-4 py-3 text-center">
          {rerouteBanner}
        </div>
      )}
      {/* Top Banner - DISPATCHER STATUS */}
      <div className={`p-4 border-b border-white/5 flex items-center justify-between ${shipment.riskScore >= 65 ? 'bg-red-500 text-white' : 'bg-blue-600'}`}>
        <div className="flex items-center gap-3">
          <Truck className="w-6 h-6" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-tighter opacity-80">Shipment Active</p>
            <p className="font-black text-lg -mt-1">{shipmentId}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-tighter opacity-80">Arrival Status</p>
          <p className="font-black text-lg -mt-1">
             {shipment.riskScore >= 65 ? 'DELAY RISK' : 'ON TRACK'}
          </p>
        </div>
      </div>

      <div className="p-6 space-y-8 max-w-lg mx-auto pb-32">
        {/* Destination Card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 text-white/5 -z-10 group-hover:scale-110 transition-transform">
             <Navigation className="w-24 h-24 rotate-45" />
          </div>
          
          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <div className="w-px h-10 bg-gradient-to-b from-blue-500 to-emerald-500" />
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="space-y-4">
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Origin</p>
                  <p className="font-bold text-slate-200">{originName}</p>
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Destination</p>
                  <p className="font-bold text-slate-200">{destinationName}</p>
               </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-1 text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase">Next ETA</span>
              </div>
              <p className="text-xl font-black text-blue-400">
                {new Date(shipment.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-1 text-slate-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase">Risk Score</span>
              </div>
              <p className={`text-xl font-black ${shipment.riskScore >= 65 ? 'text-red-500' : 'text-emerald-400'}`}>
                {shipment.riskScore}%
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cargo Summary</p>
            <p className="text-sm font-bold text-slate-200">{cargoSummary}</p>
          </div>
          <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hours of Service</p>
            <p className="text-sm font-bold text-slate-200">{hosHours.toFixed(1)} / 9 hours today</p>
            {hosAlert && (
              <p className={`mt-2 text-xs font-black uppercase tracking-wide ${hosHours >= 8 ? 'text-red-400' : 'text-amber-400'}`}>
                {hosAlert}
              </p>
            )}
            <button
              onClick={handleLogRestStop}
              disabled={restLoading}
              className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60"
            >
              {restLoading ? 'Logging rest stop...' : 'Log rest stop'}
            </button>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="space-y-4">
           {/* Telemetry Toggle */}
           <button 
             onClick={() => {
                if (!isTracking) setError(null);
                setIsTracking(!isTracking);
             }}
             className={`w-full py-6 rounded-3xl border-2 transition-all flex items-center justify-center gap-4 ${
               isTracking 
               ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' 
               : 'bg-white/5 border-white/10 text-white hover:border-blue-500/50'
             }`}
           >
              {isTracking ? <Radio className="w-8 h-8 animate-ping" /> : <Navigation2 className="w-8 h-8" />}
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest">Live Telemetry</p>
                <p className="text-xl font-black">{isTracking ? 'TRACKING LIVE' : 'START TRACKING'}</p>
              </div>
           </button>

           {/* HOS Fatigue Toggle */}
           <button 
             onClick={() => setIsResting(!isResting)}
             className={`w-full py-6 rounded-3xl border-2 transition-all flex items-center justify-center gap-4 ${
               isResting 
               ? 'bg-orange-500/10 border-orange-500 text-orange-400' 
               : 'bg-white/5 border-white/10 text-white'
             }`}
           >
              {isResting ? <Coffee className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest">HOS Safety</p>
                <p className="text-xl font-black">{isResting ? 'RESTING (OFF-DUTY)' : 'ON-DUTY (DRIVING)'}</p>
              </div>
           </button>
        </div>

        {/* Last Activity */}
        <div className="text-center">
           {lastPing ? (
             <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest flex items-center justify-center gap-2">
               <CheckCircle2 className="w-3 h-3" />
               Last Signal Reached Tower: {lastPing}
             </p>
           ) : (
             <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
               Signal offline. Telemetry inactive.
             </p>
           )}
           {error && <p className="text-[10px] font-black text-red-500 uppercase mt-2">{error}</p>}
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent">
         <button 
            onClick={() => {
              if (destinationName && !destinationName.startsWith('Loading') && !destinationName.startsWith('Unknown')) {
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationName)}`, '_blank');
              } else {
                alert('Destination address not fully loaded yet.');
              }
            }}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-2xl flex items-center justify-center gap-2 transition-transform active:scale-95"
         >
            <MapPin className="w-5 h-5" />
            OPEN NAVIGATOR (GOOGLE MAPS)
         </button>
      </div>
    </div>
  );
}
