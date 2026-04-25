import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId') || undefined;

    const productsSnap = await adminDb.collection('products').where('isActive', '==', true).get();
    const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const totalSKUs = products.length;

    let stockLevelsSnap;
    if (warehouseId) {
      stockLevelsSnap = await adminDb.collection('stockLevels').where('warehouseId', '==', warehouseId).get();
    } else {
      stockLevelsSnap = await adminDb.collection('stockLevels').get();
    }
    const stockLevels = stockLevelsSnap.docs.map(doc => doc.data());

    let lowStockCount = 0;
    for (const doc of productsSnap.docs) {
      const product = { id: doc.id, ...doc.data() } as any;
      const pStock = stockLevels.filter(sl => sl.productId === product.id);
      const totalQty = pStock.reduce((sum, sl) => sum + (sl.quantity || 0), 0);
      if (totalQty < (product.reorderLevel || 0)) {
        lowStockCount++;
      }
    }

    let reqsSnap;
    if (warehouseId) {
      reqsSnap = await adminDb.collection('requisitions').where('status', '==', 'SUBMITTED').where('requestingWarehouseId', '==', warehouseId).get();
    } else {
      reqsSnap = await adminDb.collection('requisitions').where('status', '==', 'SUBMITTED').get();
    }
    const pendingRequisitions = reqsSnap.size;

    const transfersSnap = await adminDb.collection('transfers').where('status', 'in', ['DRAFT', 'IN_TRANSIT']).get();
    let pendingTransfers = 0;
    if (warehouseId) {
      pendingTransfers = transfersSnap.docs.filter(doc => {
        const d = doc.data();
        return d.sourceWarehouseId === warehouseId || d.targetWarehouseId === warehouseId;
      }).length;
    } else {
      pendingTransfers = transfersSnap.size;
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const moveSnap = await adminDb.collection('stockMovements').where('createdAt', '>=', ninetyDaysAgo).get();
    const activePids = new Set(moveSnap.docs.map(d => d.data().productId));
    const stockPids = new Set(stockLevels.map(sl => sl.productId));
    let slowDeadStockCount = 0;
    for (const pid of stockPids) {
      if (!activePids.has(pid)) {
        slowDeadStockCount++;
      }
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const delSnap = await adminDb.collection('stockMovements')
      .where('type', '==', 'DELIVERY')
      .where('createdAt', '>=', thirtyDaysAgo)
      .get();
    const stockoutEvents = delSnap.size;

    return NextResponse.json({
      totalSKUs,
      lowStockCount,
      pendingRequisitions,
      pendingTransfers,
      slowDeadStockCount,
      stockoutEvents,
    });
  } catch (error: any) {
    console.error('Dashboard summary API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
