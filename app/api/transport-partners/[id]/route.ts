import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';
import { PartnerStatus, VehicleType } from '@/lib/types/transport';

const allowedStatuses: PartnerStatus[] = ['AVAILABLE', 'ON_JOB', 'OFFLINE'];
const allowedVehicleTypes: VehicleType[] = ['TRUCK', 'FERRY', 'AIR', 'RAIL'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSessionFirebase();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const partnerDoc = await adminDb.collection('transportPartners').doc(id).get();
    if (!partnerDoc.exists) {
      return NextResponse.json({ error: 'Transport partner not found.' }, { status: 404 });
    }

    const partner = partnerDoc.data() as any;
    const businessId = (session.user as any)?.businessId;
    if (partner.partnerType === 'TIED' && businessId && partner.businessId !== businessId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ id: partnerDoc.id, ...partner });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch transport partner.' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSessionFirebase();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'MANAGER', 'TRANSPORT'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const partnerRef = adminDb.collection('transportPartners').doc(id);
    const partnerDoc = await partnerRef.get();
    if (!partnerDoc.exists) {
      return NextResponse.json({ error: 'Transport partner not found.' }, { status: 404 });
    }

    const current = partnerDoc.data() as any;
    const body = await request.json();
    const updateData: Record<string, any> = {};

    if (body.status !== undefined) {
      if (!allowedStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
      }
      updateData.status = body.status;
    }
    if (body.currentLat !== undefined) {
      const lat = Number(body.currentLat);
      if (!Number.isFinite(lat)) return NextResponse.json({ error: 'currentLat must be numeric.' }, { status: 400 });
      updateData.currentLat = lat;
    }
    if (body.currentLng !== undefined) {
      const lng = Number(body.currentLng);
      if (!Number.isFinite(lng)) return NextResponse.json({ error: 'currentLng must be numeric.' }, { status: 400 });
      updateData.currentLng = lng;
    }
    if (body.hoursLoggedToday !== undefined) {
      const hours = Number(body.hoursLoggedToday);
      if (!Number.isFinite(hours) || hours < 0) {
        return NextResponse.json({ error: 'hoursLoggedToday must be a non-negative number.' }, { status: 400 });
      }
      updateData.hoursLoggedToday = hours;
    }
    if (body.lastRestAt !== undefined) {
      if (body.lastRestAt === null) {
        updateData.lastRestAt = null;
      } else {
        const restDate = new Date(body.lastRestAt);
        if (Number.isNaN(restDate.getTime())) {
          return NextResponse.json({ error: 'lastRestAt must be a valid date or null.' }, { status: 400 });
        }
        updateData.lastRestAt = restDate.toISOString();
      }
    }
    if (body.vehicleTypes !== undefined) {
      if (!Array.isArray(body.vehicleTypes) || body.vehicleTypes.some((v: any) => !allowedVehicleTypes.includes(v))) {
        return NextResponse.json({ error: 'vehicleTypes contains invalid values.' }, { status: 400 });
      }
      updateData.vehicleTypes = body.vehicleTypes;
    }

    updateData.updatedAt = new Date().toISOString();
    await partnerRef.update(updateData);
    const updated = await partnerRef.get();

    return NextResponse.json({ id: updated.id, ...current, ...updated.data() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update transport partner.' }, { status: 500 });
  }
}
