import { adminDb } from '@/lib/firebase/admin';
import crypto from 'crypto';
import { logEvent } from '@/lib/services/loggerService';

export type ShipmentType = 'INBOUND' | 'OUTBOUND' | 'TRANSFER';
export type LinkedDocumentType = 'RECEIPT' | 'DELIVERY' | 'TRANSFER';
export type OriginType = 'WAREHOUSE' | 'VENDOR' | 'ADDRESS';
export type DestinationType = 'WAREHOUSE' | 'ADDRESS';
export type VehicleType = 'TRUCK' | 'FERRY' | 'AIR' | 'RAIL';

export interface ShipmentWaypointInput {
  type: OriginType | DestinationType;
  id?: string;
  address?: string;
}

export interface ShipmentCargoLineInput {
  productId: string;
  quantity: number;
}

export interface CreateShipmentRequestBody {
  type: ShipmentType;
  linkedDocumentId: string;
  linkedDocumentType: LinkedDocumentType;
  origin: {
    type: OriginType;
    id?: string;
    address?: string;
  };
  destination: {
    type: DestinationType;
    id?: string;
    address?: string;
  };
  transportPartnerId?: string;
  vehicleType: VehicleType;
  cargo: Array<ShipmentCargoLineInput>;
  eta: string;
}

export interface Coordinate {
  lat: number;
  lng: number;
}

const SHIPMENT_TYPES: ShipmentType[] = ['INBOUND', 'OUTBOUND', 'TRANSFER'];
const LINKED_DOCUMENT_TYPES: LinkedDocumentType[] = ['RECEIPT', 'DELIVERY', 'TRANSFER'];
const ORIGIN_TYPES: OriginType[] = ['WAREHOUSE', 'VENDOR', 'ADDRESS'];
const DESTINATION_TYPES: DestinationType[] = ['WAREHOUSE', 'ADDRESS'];
const VEHICLE_TYPES: VehicleType[] = ['TRUCK', 'FERRY', 'AIR', 'RAIL'];

const nanoid = (size: number): string => {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const random = crypto.randomBytes(size);
  let id = '';
  for (let i = 0; i < size; i += 1) {
    id += alphabet[random[i] % alphabet.length];
  }
  return id;
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

const extractCoordinates = (source: any): Coordinate | null => {
  if (!source || typeof source !== 'object') {
    return null;
  }

  const directLat = Number(source.lat ?? source.latitude);
  const directLng = Number(source.lng ?? source.longitude);
  if (Number.isFinite(directLat) && Number.isFinite(directLng)) {
    return { lat: directLat, lng: directLng };
  }

  if (source.coordinates && typeof source.coordinates === 'object') {
    const coordLat = Number(source.coordinates.lat ?? source.coordinates.latitude);
    const coordLng = Number(source.coordinates.lng ?? source.coordinates.longitude);
    if (Number.isFinite(coordLat) && Number.isFinite(coordLng)) {
      return { lat: coordLat, lng: coordLng };
    }
  }

  return null;
};

const resolveWaypointCoordinates = async (waypoint: ShipmentWaypointInput): Promise<Coordinate | null> => {
  if (waypoint.type !== 'WAREHOUSE' || !isNonEmptyString(waypoint.id)) {
    return null;
  }

  const warehouseDoc = await adminDb.collection('warehouses').doc(waypoint.id).get();
  if (!warehouseDoc.exists) {
    return null;
  }

  return extractCoordinates(warehouseDoc.data());
};

const decodePolyline = (encoded: string): Coordinate[] => {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const points: Coordinate[] = [];

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5
    });
  }

  return points;
};

const fetchRouteGeometry = async (origin: Coordinate, destination: Coordinate): Promise<Coordinate[]> => {
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsApiKey) {
    await logEvent('WARNING', 'Directions skipped: GOOGLE_MAPS_API_KEY missing', {
      provider: 'google_maps',
      api: 'directions',
      origin,
      destination
    });
    return [];
  }

  const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
  url.searchParams.set('origin', `${origin.lat},${origin.lng}`);
  url.searchParams.set('destination', `${destination.lat},${destination.lng}`);
  url.searchParams.set('departure_time', 'now');
  url.searchParams.set('key', mapsApiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    await logEvent('ERROR', 'Google Maps Directions HTTP failure during shipment route generation', {
      provider: 'google_maps',
      api: 'directions',
      httpStatus: response.status,
      origin,
      destination
    });
    throw new Error(`Google Maps Directions API returned status ${response.status}`);
  }

  const payload = await response.json();
  if (payload.status !== 'OK') {
    await logEvent('ERROR', 'Google Maps Directions API returned non-OK status', {
      provider: 'google_maps',
      api: 'directions',
      status: payload.status,
      origin,
      destination
    });
    throw new Error(`Google Maps Directions API error: ${payload.status}`);
  }

  const encodedPolyline = payload.routes?.[0]?.overview_polyline?.points;
  if (!isNonEmptyString(encodedPolyline)) {
    return [];
  }

  const decoded = decodePolyline(encodedPolyline);
  await logEvent('INFO', 'Google Maps Directions route generated for shipment', {
    provider: 'google_maps',
    api: 'directions',
    points: decoded.length
  });
  return decoded;
};

export const validateCreateShipmentBody = (
  body: unknown
): { valid: true; data: CreateShipmentRequestBody } | { valid: false; error: string } => {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a valid JSON object.' };
  }

  const parsed = body as Partial<CreateShipmentRequestBody>;

  if (!SHIPMENT_TYPES.includes(parsed.type as ShipmentType)) {
    return { valid: false, error: 'Invalid "type". Allowed values: INBOUND, OUTBOUND, TRANSFER.' };
  }
  if (!isNonEmptyString(parsed.linkedDocumentId)) {
    return { valid: false, error: '"linkedDocumentId" is required and must be a non-empty string.' };
  }
  if (!LINKED_DOCUMENT_TYPES.includes(parsed.linkedDocumentType as LinkedDocumentType)) {
    return { valid: false, error: 'Invalid "linkedDocumentType". Allowed values: RECEIPT, DELIVERY, TRANSFER.' };
  }

  if (!parsed.origin || typeof parsed.origin !== 'object') {
    return { valid: false, error: '"origin" is required and must be an object.' };
  }
  if (!ORIGIN_TYPES.includes(parsed.origin.type as OriginType)) {
    return { valid: false, error: 'Invalid "origin.type". Allowed values: WAREHOUSE, VENDOR, ADDRESS.' };
  }
  if ((parsed.origin.type === 'WAREHOUSE' || parsed.origin.type === 'VENDOR') && !isNonEmptyString(parsed.origin.id)) {
    return { valid: false, error: `"origin.id" is required when origin.type is ${parsed.origin.type}.` };
  }
  if (parsed.origin.type === 'ADDRESS' && !isNonEmptyString(parsed.origin.address)) {
    return { valid: false, error: '"origin.address" is required when origin.type is ADDRESS.' };
  }

  if (!parsed.destination || typeof parsed.destination !== 'object') {
    return { valid: false, error: '"destination" is required and must be an object.' };
  }
  if (!DESTINATION_TYPES.includes(parsed.destination.type as DestinationType)) {
    return { valid: false, error: 'Invalid "destination.type". Allowed values: WAREHOUSE, ADDRESS.' };
  }
  if (parsed.destination.type === 'WAREHOUSE' && !isNonEmptyString(parsed.destination.id)) {
    return { valid: false, error: '"destination.id" is required when destination.type is WAREHOUSE.' };
  }
  if (parsed.destination.type === 'ADDRESS' && !isNonEmptyString(parsed.destination.address)) {
    return { valid: false, error: '"destination.address" is required when destination.type is ADDRESS.' };
  }

  if (!VEHICLE_TYPES.includes(parsed.vehicleType as VehicleType)) {
    return { valid: false, error: 'Invalid "vehicleType". Allowed values: TRUCK, FERRY, AIR, RAIL.' };
  }

  if (!Array.isArray(parsed.cargo) || parsed.cargo.length === 0) {
    return { valid: false, error: '"cargo" is required and must be a non-empty array.' };
  }
  for (const [index, line] of parsed.cargo.entries()) {
    if (!line || typeof line !== 'object') {
      return { valid: false, error: `cargo[${index}] must be an object.` };
    }
    if (!isNonEmptyString(line.productId)) {
      return { valid: false, error: `cargo[${index}].productId is required and must be a non-empty string.` };
    }
    if (typeof line.quantity !== 'number' || !Number.isFinite(line.quantity) || line.quantity <= 0) {
      return { valid: false, error: `cargo[${index}].quantity must be a positive number.` };
    }
  }

  if (!isNonEmptyString(parsed.eta)) {
    return { valid: false, error: '"eta" is required and must be an ISO date string.' };
  }
  const etaDate = new Date(parsed.eta);
  if (Number.isNaN(etaDate.getTime())) {
    return { valid: false, error: '"eta" must be a valid ISO date string.' };
  }

  return { valid: true, data: parsed as CreateShipmentRequestBody };
};

export const createShipmentForBusiness = async (
  businessId: string,
  payload: CreateShipmentRequestBody
): Promise<{ id: string; _id: string; [key: string]: any }> => {
  const nowIso = new Date().toISOString();
  const shipmentId = `SHP-${nanoid(8)}`;

  const shipmentDoc = {
    shipmentId,
    businessId,
    type: payload.type,
    linkedDocumentId: payload.linkedDocumentId,
    linkedDocumentType: payload.linkedDocumentType,
    origin: {
      type: payload.origin.type,
      warehouseId: payload.origin.type === 'WAREHOUSE' ? payload.origin.id : null,
      vendorId: payload.origin.type === 'VENDOR' ? payload.origin.id : null,
      address: payload.origin.type === 'ADDRESS' ? payload.origin.address : null
    },
    destination: {
      type: payload.destination.type,
      warehouseId: payload.destination.type === 'WAREHOUSE' ? payload.destination.id : null,
      address: payload.destination.type === 'ADDRESS' ? payload.destination.address : null
    },
    transportPartnerId: payload.transportPartnerId || null,
    vehicleType: payload.vehicleType,
    cargo: payload.cargo.map((line) => ({
      productId: line.productId,
      quantity: line.quantity
    })),
    eta: payload.eta,
    etaP75: payload.eta,
    etaP95: payload.eta,
    originalEta: payload.eta,
    originalDurationSeconds: 0,   // updated after route geometry fetch
    expectedDurationMinutes: 0,   // updated after route geometry fetch
    customsHoldProbability: 0,    // SPEC: default 0, set to 0.85 on HOLD event
    lastTrafficDelayMinutes: 0,   // SPEC: fallback for rate-limited scans
    lastWeatherSeverity: 0,       // SPEC: fallback for rate-limited scans
    status: 'PENDING',
    riskScore: 0,
    riskHistory: [],
    routeGeometry: [] as Coordinate[],
    createdAt: nowIso,
    updatedAt: nowIso

  };

  const createdRef = await adminDb.collection('shipments').add(shipmentDoc);
  const originCoordinates = await resolveWaypointCoordinates(payload.origin);
  const destinationCoordinates = await resolveWaypointCoordinates(payload.destination);

  if (originCoordinates && destinationCoordinates) {
    const routeGeometry = await fetchRouteGeometry(originCoordinates, destinationCoordinates);
    await createdRef.update({
      routeGeometry,
      updatedAt: new Date().toISOString()
    });
  }

  const createdSnapshot = await createdRef.get();
  return {
    _id: createdSnapshot.id,
    id: createdSnapshot.id,
    ...createdSnapshot.data()
  };
};
