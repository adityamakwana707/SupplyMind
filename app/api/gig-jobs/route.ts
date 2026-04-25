import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';
import { haversineKm } from '@/lib/utils/geo';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lat = Number(searchParams.get('lat'));
    const lng = Number(searchParams.get('lng'));
    const radiusKm = Number(searchParams.get('radius') || '100');

    const openJobsSnap = await adminDb.collection('gigJobs').where('status', '==', 'OPEN').get();
    let jobs = openJobsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];

    if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radiusKm) && radiusKm > 0) {
      const shipmentCache = new Map<string, any>();
      const filtered: any[] = [];
      for (const job of jobs) {
        const shipmentId = job.shipmentId;
        if (!shipmentId) continue;

        let shipment = shipmentCache.get(shipmentId);
        if (!shipment) {
          const shipmentDoc = await adminDb.collection('shipments').doc(shipmentId).get();
          if (!shipmentDoc.exists) continue;
          shipment = shipmentDoc.data() as any;
          shipmentCache.set(shipmentId, shipment);
        }

        const currentLat = Number(shipment.currentLat);
        const currentLng = Number(shipment.currentLng);
        if (!Number.isFinite(currentLat) || !Number.isFinite(currentLng)) continue;

        const distance = haversineKm(lat, lng, currentLat, currentLng);
        if (distance <= radiusKm) {
          filtered.push({ ...job, distanceKm: distance });
        }
      }
      jobs = filtered;
    }

    jobs.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    return NextResponse.json(jobs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list gig jobs.' }, { status: 500 });
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

    const body = await request.json();
    const {
      shipmentId,
      businessId,
      offeredTo,
      estimatedPay,
      searchRadiusKm,
      offerExpiresAt
    } = body;

    if (typeof shipmentId !== 'string' || !shipmentId) {
      return NextResponse.json({ error: 'shipmentId is required.' }, { status: 400 });
    }
    if (!Array.isArray(offeredTo) || offeredTo.length === 0) {
      return NextResponse.json({ error: 'offeredTo must be a non-empty partner id array.' }, { status: 400 });
    }
    if (typeof estimatedPay !== 'number' || estimatedPay <= 0) {
      return NextResponse.json({ error: 'estimatedPay must be a positive number.' }, { status: 400 });
    }
    if (typeof searchRadiusKm !== 'number' || searchRadiusKm <= 0) {
      return NextResponse.json({ error: 'searchRadiusKm must be a positive number.' }, { status: 400 });
    }

    const expires = new Date(offerExpiresAt);
    if (Number.isNaN(expires.getTime())) {
      return NextResponse.json({ error: 'offerExpiresAt must be a valid date.' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const ref = await adminDb.collection('gigJobs').add({
      shipmentId,
      businessId: businessId ?? (session.user as any).businessId ?? null,
      jobType: 'TRANSPORT',
      offeredTo,
      acceptedBy: null,
      offerExpiresAt: expires.toISOString(),
      searchRadiusKm,
      estimatedPay,
      status: 'OPEN',
      createdAt: nowIso,
      updatedAt: nowIso
    });

    const created = await ref.get();
    return NextResponse.json({ id: created.id, ...created.data() }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create gig job.' }, { status: 500 });
  }
}
