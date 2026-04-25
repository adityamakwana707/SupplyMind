import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';
import { haversineKm } from '@/lib/utils/geo';
import { TransportPartner, VehicleType } from '@/lib/types/transport';

const allowedVehicleTypes: VehicleType[] = ['TRUCK', 'FERRY', 'AIR', 'RAIL'];

const toTransportPartner = (id: string, data: any): TransportPartner => ({
  id,
  businessId: data.businessId ?? null,
  partnerType: data.partnerType,
  name: data.name,
  phone: data.phone,
  vehicleTypes: data.vehicleTypes || [],
  vehicleCapacityKg: Number(data.vehicleCapacityKg || 0),
  licenseNumber: data.licenseNumber,
  currentLat: data.currentLat ?? null,
  currentLng: data.currentLng ?? null,
  status: data.status,
  reliabilityScore: Number(data.reliabilityScore || 0),
  hoursLoggedToday: Number(data.hoursLoggedToday || 0),
  lastRestAt: data.lastRestAt ? new Date(data.lastRestAt) : null,
  createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now())
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const businessId = (session.user as any)?.businessId;
    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId in session.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const vehicleTypeFilter = searchParams.get('vehicleType');
    const lat = Number(searchParams.get('lat'));
    const lng = Number(searchParams.get('lng'));
    const radiusKm = Number(searchParams.get('radius') || '0');

    const tiedSnapshot = await adminDb.collection('transportPartners')
      .where('partnerType', '==', 'TIED')
      .where('businessId', '==', businessId)
      .get();

    const gigSnapshot = await adminDb.collection('transportPartners')
      .where('partnerType', '==', 'GIG')
      .where('businessId', '==', null)
      .get();

    let partners = [...tiedSnapshot.docs, ...gigSnapshot.docs].map((doc) => toTransportPartner(doc.id, doc.data()));

    if (statusFilter) {
      partners = partners.filter((partner) => partner.status === statusFilter);
    }
    if (vehicleTypeFilter) {
      partners = partners.filter((partner) => partner.vehicleTypes.includes(vehicleTypeFilter as VehicleType));
    }
    if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radiusKm) && radiusKm > 0) {
      partners = partners.filter((partner) => {
        if (!Number.isFinite(Number(partner.currentLat)) || !Number.isFinite(Number(partner.currentLng))) {
          return false;
        }
        const distanceKm = haversineKm(lat, lng, Number(partner.currentLat), Number(partner.currentLng));
        return distanceKm <= radiusKm;
      });
    }

    return NextResponse.json(partners);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list transport partners.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'MANAGER'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const businessId = (session.user as any)?.businessId;
    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId in session.' }, { status: 400 });
    }

    const body = await request.json();
    const { name, phone, vehicleTypes, vehicleCapacityKg, licenseNumber } = body;

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required.' }, { status: 400 });
    }
    if (typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json({ error: 'phone is required.' }, { status: 400 });
    }
    if (!Array.isArray(vehicleTypes) || vehicleTypes.length === 0 || vehicleTypes.some((v) => !allowedVehicleTypes.includes(v))) {
      return NextResponse.json({ error: 'vehicleTypes must contain valid vehicle types.' }, { status: 400 });
    }
    if (typeof vehicleCapacityKg !== 'number' || vehicleCapacityKg <= 0) {
      return NextResponse.json({ error: 'vehicleCapacityKg must be a positive number.' }, { status: 400 });
    }
    if (typeof licenseNumber !== 'string' || !licenseNumber.trim()) {
      return NextResponse.json({ error: 'licenseNumber is required.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const partnerRef = await adminDb.collection('transportPartners').add({
      businessId,
      partnerType: 'TIED',
      name: name.trim(),
      phone: phone.trim(),
      vehicleTypes,
      vehicleCapacityKg,
      licenseNumber: licenseNumber.trim(),
      currentLat: null,
      currentLng: null,
      status: 'AVAILABLE',
      reliabilityScore: 80,
      hoursLoggedToday: 0,
      lastRestAt: null,
      createdAt: now,
      updatedAt: now
    });

    const created = await partnerRef.get();
    return NextResponse.json(toTransportPartner(created.id, created.data()), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to register transport partner.' }, { status: 500 });
  }
}
