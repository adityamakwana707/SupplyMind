import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb, admin } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');

    let stockQuery: admin.firestore.Query = adminDb.collection('stockLevels');
    if (warehouseId) {
      stockQuery = stockQuery.where('warehouseId', '==', warehouseId);
    }
    const stockSnap = await stockQuery.get();
    
    const productsWithStock = [...new Set(stockSnap.docs.map(d => d.data().productId))];
    const products = productsWithStock; // we just need the count, length of set is fine

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const movesSnap = await adminDb.collection('stockMovements').get();
    const movements = movesSnap.docs.map(d => d.data());

    const activeProducts = new Set();
    const slowProducts = new Set();
    
    movements.forEach(m => {
      const dDate = m.createdAt.toDate();
      if (dDate >= thirtyDaysAgo) {
        activeProducts.add(m.productId);
      } else if (dDate >= ninetyDaysAgo && dDate < thirtyDaysAgo) {
        slowProducts.add(m.productId);
      }
    });

    const deadProducts = productsWithStock.filter(pid => !activeProducts.has(pid) && !slowProducts.has(pid));

    return NextResponse.json({
      activeCount: activeProducts.size,
      slowCount: slowProducts.size,
      deadCount: deadProducts.length,
      totalProducts: products.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
