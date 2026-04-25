import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';

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

    const { searchParams } = new URL(request.url); const warehouseId = searchParams.get('warehouseId');

    let query: FirebaseFirestore.Query = adminDb.collection('stock_levels').where('productId', '==', id);

    if (warehouseId) {
      query = query.where('warehouseId', '==', warehouseId);
    }

    const snapshot = await query.get();
    const stockLevels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    const warehouseCache: Record<string, any> = {};
    const locationCache: Record<string, any> = {};

    for (const level of stockLevels) {
      const wId = level.warehouseId;
      const lId = level.locationId;

      if (wId && !warehouseCache[wId]) {
        const wDoc = await adminDb.collection('warehouses').doc(wId).get();
        if (wDoc.exists) warehouseCache[wId] = { _id: wId, ...wDoc.data() };
      }
      if (lId && !locationCache[lId]) {
        const lDoc = await adminDb.collection('locations').doc(lId).get();
        if (lDoc.exists) locationCache[lId] = { _id: lId, ...lDoc.data() };
      }
    }

    const groupedByWarehouse: Record<string, any> = {};
    let totalQuantity = 0;

    for (const level of stockLevels) {
      const wId = level.warehouseId;
      const lId = level.locationId;
      const wData = warehouseCache[wId] || { _id: wId };
      const lData = locationCache[lId] || { _id: lId };
      const qty = level.quantity || 0;

      if (!groupedByWarehouse[wId]) {
        groupedByWarehouse[wId] = {
          warehouse: wData,
          locations: [],
          total: 0,
        };
      }

      groupedByWarehouse[wId].locations.push({
        location: lData,
        quantity: qty,
        updatedAt: level.updatedAt,
      });

      groupedByWarehouse[wId].total += qty;
      totalQuantity += qty;
    }

    return NextResponse.json({
      productId: id,
      totalQuantity,
      byWarehouse: Object.values(groupedByWarehouse),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}