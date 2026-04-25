import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'VENDOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const vendorId = (session.user as any).vendorId;
    if (!vendorId) return NextResponse.json({ error: 'Vendor context missing in session.' }, { status: 400 });

    const [receiptsSnap, shipmentsByVendorSnap, shipmentsByOriginVendorSnap] = await Promise.all([
      adminDb.collection('receipts').where('vendorId', '==', vendorId).get(),
      adminDb.collection('shipments').where('vendorId', '==', vendorId).get(),
      adminDb.collection('shipments').where('origin.vendorId', '==', vendorId).get()
    ]);

    const unified = new Map<string, any>();

    receiptsSnap.docs.forEach((doc) => {
      const data = doc.data() as any;
      unified.set(`receipt-${doc.id}`, {
        id: `receipt-${doc.id}`,
        sourceType: 'RECEIPT',
        sourceId: doc.id,
        reference: data.receiptNumber || data.reference || doc.id,
        status: data.status || 'DRAFT',
        warehouseId: data.warehouseId || null,
        createdAt: data.createdAt || null,
        eta: data.expectedDeliveryDate || null
      });
    });

    const allShipments = [...shipmentsByVendorSnap.docs, ...shipmentsByOriginVendorSnap.docs];
    const seenShipmentIds = new Set<string>();
    allShipments.forEach((doc) => {
      if (seenShipmentIds.has(doc.id)) return;
      seenShipmentIds.add(doc.id);
      const data = doc.data() as any;
      unified.set(`shipment-${doc.id}`, {
        id: `shipment-${doc.id}`,
        sourceType: 'SHIPMENT',
        sourceId: doc.id,
        reference: data.shipmentId || doc.id,
        status: data.status || 'PENDING',
        warehouseId: data.destination?.warehouseId || null,
        createdAt: data.createdAt || null,
        eta: data.eta || null
      });
    });

    const results = Array.from(unified.values()).sort((a, b) => {
      const aTime = new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load vendor purchase orders.' }, { status: 500 });
  }
}
