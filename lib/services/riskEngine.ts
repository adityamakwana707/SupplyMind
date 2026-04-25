import { adminDb } from '../firebase/admin';
import { runCascadeSimulation } from './cascadeEngine';
import { mapsDistanceLimit, openWeatherLimit } from '@/lib/rateLimit';
import { scanDeduplicator } from '@/lib/scanDeduplicator';
import { scanLock } from '@/lib/scanLock';
import { logEvent } from './loggerService';

interface ShipmentDestination {
  warehouseId?: string;
  id?: string;
  address?: string;
}

interface ShipmentRoutePoint {
  lat: number;
  lng: number;
}

interface ShipmentRiskRecord {
  shipmentId?: string;
  destination?: ShipmentDestination;
  routeGeometry?: ShipmentRoutePoint[];
  currentLat?: number;
  currentLng?: number;
  originalDurationSeconds?: number;
  expectedDurationMinutes?: number;
  vendorId?: string;
  transportPartnerId?: string;
  customsHoldProbability?: number;
  lastTrafficDelayMinutes?: number;
  lastWeatherSeverity?: number;
  riskHistory?: any[];
  [key: string]: any;
}

interface DistanceMatrixElement {
  status: string;
  duration?: { value: number };
  duration_in_traffic?: { value: number };
}

const getDestinationCoordinates = async (shipment: ShipmentRiskRecord): Promise<{ lat: number; lng: number }> => {
  const destination = shipment.destination || {};
  const directLat = Number((destination as any).lat ?? (destination as any).latitude);
  const directLng = Number((destination as any).lng ?? (destination as any).longitude);
  if (Number.isFinite(directLat) && Number.isFinite(directLng)) {
    return { lat: directLat, lng: directLng };
  }

  const warehouseId = destination.warehouseId || destination.id;
  if (!warehouseId) {
    throw new Error('Shipment destination coordinates are missing.');
  }

  const warehouseDoc = await adminDb.collection('warehouses').doc(warehouseId).get();
  if (!warehouseDoc.exists) {
    throw new Error(`Destination warehouse not found: ${warehouseId}`);
  }

  const warehouseData = warehouseDoc.data() || {};
  const warehouseLat = Number((warehouseData as any).lat ?? (warehouseData as any).latitude ?? warehouseData.coordinates?.lat);
  const warehouseLng = Number((warehouseData as any).lng ?? (warehouseData as any).longitude ?? warehouseData.coordinates?.lng);
  if (!Number.isFinite(warehouseLat) || !Number.isFinite(warehouseLng)) {
    throw new Error(`Destination warehouse coordinates missing for ${warehouseId}`);
  }

  return { lat: warehouseLat, lng: warehouseLng };
};

const getExpectedDurationMinutes = (shipment: ShipmentRiskRecord): number => {
  const expectedDurationMinutes = Number(shipment.expectedDurationMinutes);
  if (Number.isFinite(expectedDurationMinutes) && expectedDurationMinutes > 0) {
    return expectedDurationMinutes;
  }

  const originalDurationSeconds = Number(shipment.originalDurationSeconds);
  if (Number.isFinite(originalDurationSeconds) && originalDurationSeconds > 0) {
    return originalDurationSeconds / 60;
  }

  return 60;
};

const getTrafficDelayMinutes = async (shipment: ShipmentRiskRecord): Promise<number> => {
  const shipmentIdentifier = shipment.shipmentId || 'UNKNOWN';
  const currentLat = Number(shipment.currentLat);
  const currentLng = Number(shipment.currentLng);
  if (!Number.isFinite(currentLat) || !Number.isFinite(currentLng)) {
    throw new Error(`Maps API unavailable — risk scan aborted for ${shipmentIdentifier}`);
  }

  const destinationCoordinates = await getDestinationCoordinates(shipment);
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error(`Maps API unavailable — risk scan aborted for ${shipmentIdentifier}`);
  }

  try {
    const endpoint = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    endpoint.searchParams.set('origins', `${currentLat},${currentLng}`);
    endpoint.searchParams.set('destinations', `${destinationCoordinates.lat},${destinationCoordinates.lng}`);
    endpoint.searchParams.set('departure_time', `${Math.floor(Date.now() / 1000)}`);
    endpoint.searchParams.set('traffic_model', 'best_guess');
    endpoint.searchParams.set('key', apiKey);

    const response = await fetch(endpoint.toString());
    if (!response.ok) {
      await logEvent('ERROR', 'Distance Matrix HTTP failure in risk scan', {
        provider: 'google_maps',
        api: 'distance_matrix',
        shipmentId: shipmentIdentifier,
        httpStatus: response.status
      });
      throw new Error(`Distance Matrix HTTP status ${response.status}`);
    }

    const payload = await response.json();
    if (payload.status !== 'OK') {
      await logEvent('ERROR', 'Distance Matrix returned non-OK status in risk scan', {
        provider: 'google_maps',
        api: 'distance_matrix',
        shipmentId: shipmentIdentifier,
        status: payload.status
      });
      throw new Error(`Distance Matrix status ${payload.status}`);
    }

    const element: DistanceMatrixElement | undefined = payload.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK' || !element.duration_in_traffic?.value) {
      throw new Error(`Distance Matrix element status ${element?.status || 'MISSING'}`);
    }

    const liveEtaSeconds = Number(element.duration_in_traffic.value);
    const originalDurationSeconds = Number(shipment.originalDurationSeconds ?? element.duration?.value ?? 0);
    if (!Number.isFinite(liveEtaSeconds) || !Number.isFinite(originalDurationSeconds)) {
      throw new Error('Invalid traffic duration payload.');
    }

    return Math.max(0, (liveEtaSeconds - originalDurationSeconds) / 60);
  } catch (error: any) {
    await logEvent('ERROR', 'Distance Matrix request failed in risk scan', {
      provider: 'google_maps',
      api: 'distance_matrix',
      shipmentId: shipmentIdentifier,
      error: error?.message || 'unknown_error'
    });
    throw new Error(`Maps API unavailable — risk scan aborted for ${shipmentIdentifier}`);
  }
};

const getRouteMidpoint = (shipment: ShipmentRiskRecord): { lat: number; lng: number } | null => {
  if (Array.isArray(shipment.routeGeometry) && shipment.routeGeometry.length > 0) {
    const midpointIndex = Math.floor(shipment.routeGeometry.length / 2);
    const midpoint = shipment.routeGeometry[midpointIndex];
    const midLat = Number(midpoint?.lat);
    const midLng = Number(midpoint?.lng);
    if (Number.isFinite(midLat) && Number.isFinite(midLng)) {
      return { lat: midLat, lng: midLng };
    }
  }

  const currentLat = Number(shipment.currentLat);
  const currentLng = Number(shipment.currentLng);
  if (Number.isFinite(currentLat) && Number.isFinite(currentLng)) {
    return { lat: currentLat, lng: currentLng };
  }

  return null;
};

const mapWeatherConditionToSeverity = (conditionId: number): number => {
  if (conditionId >= 200 && conditionId < 300) return 90;
  if (conditionId >= 900) return 95;
  if (conditionId >= 700 && conditionId < 800) return 40;
  if (conditionId >= 300 && conditionId < 400) return 35;
  if (conditionId >= 500 && conditionId < 600) return 60;
  if (conditionId >= 600 && conditionId < 700) return 65;
  if (conditionId === 800) return 10;
  if (conditionId >= 801 && conditionId <= 804) return 20;
  return 0;
};

const getWeatherSeverity = async (shipment: ShipmentRiskRecord): Promise<number> => {
  const shipmentIdentifier = shipment.shipmentId || 'UNKNOWN';
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    await adminDb.collection('auditLogs').add({
      type: 'WEATHER_API_UNAVAILABLE',
      status: 'WARNING',
      shipmentId: shipmentIdentifier,
      message: `OpenWeather unavailable for ${shipmentIdentifier}, defaulting weather severity to 0`,
      timestamp: new Date().toISOString()
    });
    return 0;
  }

  const midpoint = getRouteMidpoint(shipment);
  if (!midpoint) {
    return 0;
  }

  try {
    const endpoint = new URL('https://api.openweathermap.org/data/2.5/weather');
    endpoint.searchParams.set('lat', `${midpoint.lat}`);
    endpoint.searchParams.set('lon', `${midpoint.lng}`);
    endpoint.searchParams.set('appid', apiKey);

    const response = await fetch(endpoint.toString());
    if (!response.ok) {
      throw new Error(`OpenWeather HTTP status ${response.status}`);
    }

    const payload = await response.json();
    const conditionId = Number(payload.weather?.[0]?.id);
    if (!Number.isFinite(conditionId)) {
      return 0;
    }

    return mapWeatherConditionToSeverity(conditionId);
  } catch (error: any) {
    await adminDb.collection('auditLogs').add({
      type: 'WEATHER_API_UNAVAILABLE',
      status: 'WARNING',
      shipmentId: shipmentIdentifier,
      message: `OpenWeather unavailable for ${shipmentIdentifier}, defaulting weather severity to 0`,
      timestamp: new Date().toISOString()
    });
    return 0;
  }
};

const getAirQualitySeverity = async (shipment: ShipmentRiskRecord): Promise<number> => {
  const shipmentIdentifier = shipment.shipmentId || 'UNKNOWN';
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return 0;

  const midpoint = getRouteMidpoint(shipment);
  if (!midpoint) return 0;

  try {
    const endpoint = new URL('https://airquality.googleapis.com/v1/currentConditions:lookup');
    endpoint.searchParams.set('key', apiKey);

    const response = await fetch(endpoint.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: { latitude: midpoint.lat, longitude: midpoint.lng }
      })
    });
    if (!response.ok) return 0;

    const payload = await response.json();
    const indexes = payload.indexes || [];
    const aqiIndex = indexes.find((idx: any) => idx.code === 'uaqi' || idx.code === 'aqi') || indexes[0];
    if (aqiIndex && aqiIndex.aqi) {
      const aqi = aqiIndex.aqi;
      // Map AQI to severity
      if (aqi > 200) return 90;
      if (aqi > 150) return 60;
      if (aqi > 100) return 30;
      return 10;
    }
    return 0;
  } catch (error) {
    return 0;
  }
};

const getVendorReliabilityScore = async (shipment: ShipmentRiskRecord): Promise<number> => {
  const vendorId = shipment.vendorId;
  if (!vendorId) {
    return 80;
  }

  const vendorDoc = await adminDb.collection('vendors').doc(vendorId).get();
  if (!vendorDoc.exists) {
    return 80;
  }

  const vendorData = vendorDoc.data() || {};
  const reliabilityScore = Number(vendorData.reliabilityScore);
  if (!Number.isFinite(reliabilityScore)) {
    return 80;
  }

  return Math.max(0, Math.min(100, reliabilityScore));
};

const getDriverHOSRiskIndex = async (shipment: ShipmentRiskRecord): Promise<number> => {
  const partnerId = shipment.transportPartnerId;
  if (!partnerId) {
    return 0;
  }

  const partnerDoc = await adminDb.collection('transportPartners').doc(partnerId).get();
  if (!partnerDoc.exists) {
    return 0;
  }

  const partnerData = partnerDoc.data() || {};
  const hoursLoggedToday = Number(partnerData.hoursLoggedToday);
  if (!Number.isFinite(hoursLoggedToday) || hoursLoggedToday <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, hoursLoggedToday / 9));
};

export const runRiskScan = async () => {
  const shipmentsSnap = await adminDb.collection('shipments')
    .where('status', 'in', ['IN_TRANSIT', 'DISPATCHED'])
    .get();

  const results: Array<{ shipmentId: string; riskScore?: number; skipped?: boolean; reason?: string }> = [];

  for (const doc of shipmentsSnap.docs) {
    const shipment = (doc.data() || {}) as ShipmentRiskRecord;
    const shipmentIdentifier = shipment.shipmentId || doc.id;

    try {
      if (!scanLock.acquire(shipmentIdentifier)) {
        results.push({ shipmentId: doc.id, skipped: true, reason: 'scan_locked' });
        continue;
      }

      try {
        if (!scanDeduplicator.canScan(shipmentIdentifier)) {
          results.push({ shipmentId: doc.id, skipped: true, reason: 'deduped' });
          continue;
        }

        let trafficDelayMinutes = 0;
        const delayMins = await mapsDistanceLimit.waitAndCall(() =>
          getTrafficDelayMinutes({ ...shipment, shipmentId: shipmentIdentifier })
        );
        if (delayMins === null) {
          console.warn(`[RiskEngine] Maps rate limited — using last known traffic delay for ${shipmentIdentifier}`);
          trafficDelayMinutes = Number.isFinite(Number(shipment.lastTrafficDelayMinutes))
            ? Number(shipment.lastTrafficDelayMinutes)
            : 0;
        } else {
          trafficDelayMinutes = delayMins;
        }

        let weatherSeverity = 0;
        const weather = await openWeatherLimit.waitAndCall(() =>
          getWeatherSeverity({ ...shipment, shipmentId: shipmentIdentifier })
        );
        if (weather === null) {
          console.warn(`[RiskEngine] Weather rate limited — using last known severity for ${shipmentIdentifier}`);
          weatherSeverity = Number.isFinite(Number(shipment.lastWeatherSeverity))
            ? Number(shipment.lastWeatherSeverity)
            : 0;
        } else {
          weatherSeverity = weather;
        }

        const aqiSeverity = await openWeatherLimit.waitAndCall(() => 
          getAirQualitySeverity({ ...shipment, shipmentId: shipmentIdentifier })
        );
        if (aqiSeverity !== null) {
          weatherSeverity = Math.max(weatherSeverity, aqiSeverity);
        }

        const vendorReliabilityScore = await getVendorReliabilityScore(shipment);
        const customsHoldProbability = shipment.customsHoldProbability ?? 0;
        const driverHOSRiskIndex = await getDriverHOSRiskIndex(shipment);

        const expectedDurationMinutes = getExpectedDurationMinutes(shipment);
        const trafficDelayRatio = Math.max(0, trafficDelayMinutes / expectedDurationMinutes);

        let riskScore = Math.round(
          (trafficDelayRatio * 100) * 0.35 +
          weatherSeverity * 0.20 +
          (100 - vendorReliabilityScore) * 0.25 +
          (customsHoldProbability * 100) * 0.15 +
          (driverHOSRiskIndex * 100) * 0.05
        );
        riskScore = Math.max(0, Math.min(100, riskScore));

        const riskFactors = {
          trafficDelayMinutes,
          trafficDelayRatio,
          weatherSeverity,
          vendorReliabilityScore,
          customsHoldProbability,
          driverHOSRiskIndex,
          weightedContribution: {
            traffic: (trafficDelayRatio * 100) * 0.35,
            weather: weatherSeverity * 0.20,
            vendor: (100 - vendorReliabilityScore) * 0.25,
            customs: (customsHoldProbability * 100) * 0.15,
            hos: (driverHOSRiskIndex * 100) * 0.05
          }
        };

        const historyItem = {
          score: riskScore,
          timestamp: new Date().toISOString(),
          factors: riskFactors
        };
        const newHistory = [...(shipment.riskHistory || []), historyItem].slice(-20);

        const updatePayload: Record<string, any> = {
          riskScore,
          riskHistory: newHistory,
          updatedAt: new Date().toISOString()
        };

        const originalEtaRaw = shipment.originalEta || shipment.eta;
        const baseEtaTime = originalEtaRaw?.toDate ? originalEtaRaw.toDate().getTime() : (originalEtaRaw ? new Date(originalEtaRaw).getTime() : Date.now());
        
        const mapsEtaMs = baseEtaTime + (trafficDelayMinutes * 60000);
        const etaP75Ms = mapsEtaMs + (trafficDelayMinutes * 60000 * 0.5);
        const etaP95Ms = mapsEtaMs + (trafficDelayMinutes * 60000 * 2.0);
        
        updatePayload.eta = new Date(mapsEtaMs).toISOString();
        updatePayload.etaP75 = new Date(etaP75Ms).toISOString();
        updatePayload.etaP95 = new Date(etaP95Ms).toISOString();

        if (delayMins !== null) updatePayload.lastTrafficDelayMinutes = trafficDelayMinutes;
        if (weather !== null) updatePayload.lastWeatherSeverity = weatherSeverity;

        await doc.ref.update(updatePayload);

        scanDeduplicator.markScanned(shipmentIdentifier);

        results.push({ shipmentId: doc.id, riskScore });

        if (riskScore >= 65) {
          const etaRaw = (shipment as any).eta;
          const eta = etaRaw?.toDate ? etaRaw.toDate() : (etaRaw ? new Date(etaRaw) : null);
          if (!eta || Number.isNaN(eta.getTime())) {
            await adminDb.collection('auditLogs').add({
              type: 'CASCADE_SKIPPED',
              status: 'WARNING',
              shipmentId: shipmentIdentifier,
              message: 'Cascade skipped: shipment ETA missing or invalid.',
              timestamp: new Date().toISOString()
            });
            continue;
          }

          const minutesToDestination = (eta.getTime() - Date.now()) / 60000;
          // Preemption window: only cascade + decisions when >= 2 hours away
          if (minutesToDestination < 120) {
            await adminDb.collection('auditLogs').add({
              type: 'CASCADE_SKIPPED',
              status: 'INFO',
              shipmentId: shipmentIdentifier,
              message: `Cascade skipped: preemption window not met (${Math.round(minutesToDestination)} minutes to destination).`,
              timestamp: new Date().toISOString()
            });
            continue;
          }

          const existingCards = await adminDb.collection('decisionCards')
            .where('shipmentId', '==', doc.id)
            .where('status', '==', 'PENDING')
            .get();

          if (existingCards.empty) {
            await runCascadeSimulation(doc.id, riskScore, Math.max(2, Math.floor(trafficDelayMinutes / 60)));
          }
        }
      } finally {
        scanLock.release(shipmentIdentifier);
      }
    } catch (error: any) {
      const errorMessage = error?.message || `Risk scan failed for ${shipmentIdentifier}`;
      await adminDb.collection('auditLogs').add({
        type: 'RISK_SCAN_SKIPPED',
        status: 'FAILURE',
        shipmentId: shipmentIdentifier,
        message: errorMessage,
        timestamp: new Date().toISOString()
      });
      results.push({ shipmentId: doc.id, skipped: true, reason: errorMessage });
      continue;
    }
  }

  return results;
};
