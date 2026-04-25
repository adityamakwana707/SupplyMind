import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';

const allowedStatuses = ['DISPATCHED', 'IN_TRANSIT', 'DELIVERED'] as const;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'VENDOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const vendorId = (session.user as any).vendorId;
    if (!vendorId) return NextResponse.json({ error: 'Vendor context missing in session.' }, { status: 400 });

    const { id } = await params;
    const shipmentRef = adminDb.collection('shipments').doc(id);
    const shipmentDoc = await shipmentRef.get();
    if (!shipmentDoc.exists) return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 });

    const shipment = shipmentDoc.data() as any;
    const shipmentVendorId = shipment?.origin?.vendorId || shipment?.origin?.id || shipment?.vendorId;
    if (shipmentVendorId !== vendorId) {
      return NextResponse.json({ error: 'Cannot update shipment for another vendor.' }, { status: 403 });
    }

    const body = await request.json();
    const status = String(body.status || '');
    const trackingNote = body.trackingNote ? String(body.trackingNote) : null;
    if (!allowedStatuses.includes(status as any)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }

    const updateData: any = {
      status,
      updatedAt: new Date().toISOString()
    };
    if (trackingNote) updateData.trackingNote = trackingNote;
    if (status === 'DISPATCHED') {
      updateData.riskScore = 0;
      updateData.riskHistory = Array.isArray(shipment.riskHistory) ? shipment.riskHistory : [];
      updateData.monitoringStartedAt = new Date().toISOString();
    }

    await shipmentRef.update(updateData);
    const updated = await shipmentRef.get();
    return NextResponse.json({ id: updated.id, ...updated.data() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update vendor shipment status.' }, { status: 500 });
  }
}
