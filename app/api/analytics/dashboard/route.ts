import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const warehouseId = searchParams.get('warehouseId');
    const period = searchParams.get('period') || '30';

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    
    // We recreate "$group" and "$lookup" with maps and filters.
    
    let movementsQuery = adminDb.collection('stockMovements').where('createdAt', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    if (warehouseId) {
      movementsQuery = movementsQuery.where('warehouseId', '==', warehouseId);
    }
    const trendsSnap = await movementsQuery.get();
    
    const trendsMap = new Map();
    trendsSnap.docs.forEach(doc => {
      const data = doc.data();
      const dateStr = data.createdAt.toDate().toISOString().split('T')[0];
      const key = `${dateStr}_${data.type}`;
      if (!trendsMap.has(key)) {
        trendsMap.set(key, { _id: { date: dateStr, type: data.type }, count: 0, totalQuantity: 0 });
      }
      const item = trendsMap.get(key);
      item.count += 1;
      item.totalQuantity += (data.quantity || 0);
    });
    
    const stockTrends = Array.from(trendsMap.values()).sort((a, b) => a._id.date.localeCompare(b._id.date));

    // Top Products
    let topQuery = adminDb.collection('stockMovements').where('createdAt', '>=', startDate);
    if (warehouseId) {
      topQuery = topQuery.where('warehouseId', '==', warehouseId);
    }
    const topSnap = await topQuery.get();
    
    const productsMap = new Map();
    topSnap.docs.forEach(doc => {
      const data = doc.data();
      const pid = data.productId;
      if (!productsMap.has(pid)) {
        productsMap.set(pid, { _id: pid, totalMovement: 0, inbound: 0, outbound: 0 });
      }
      const item = productsMap.get(pid);
      item.totalMovement += Math.abs(data.quantity || 0);
      if (data.quantity > 0) item.inbound += data.quantity;
      if (data.quantity < 0) item.outbound += Math.abs(data.quantity);
    });
    
    let topProducts = Array.from(productsMap.values()).sort((a, b) => b.totalMovement - a.totalMovement).slice(0, 10);
    const productDocs = await Promise.all(topProducts.map(p => adminDb.collection('products').doc(p._id).get()));
    
    topProducts = topProducts.map((p, i) => {
      const pd = productDocs[i]?.data() || {};
      return { ...p, name: pd.name, sku: pd.sku };
    });

    // Stock Distribution
    let distributionQuery: any = adminDb.collection('stockLevels');
    if (warehouseId) {
      distributionQuery = distributionQuery.where('warehouseId', '==', warehouseId);
    }
    const distSnap = await distributionQuery.get();
    
    const allProdIds = [...new Set(distSnap.docs.map((st: any) => st.data().productId))];
    const distProds: any[] = [];
    // fetching in batches of 10 for safety but map is simpler
    for (const pid of allProdIds as string[]) {
      const pDoc = await adminDb.collection('products').doc(pid).get();
      distProds.push({ id: pid, reorderLevel: pDoc.data()?.reorderLevel || 0 });
    }
    
    const statusCount = { 'Out of Stock': 0, 'Low Stock': 0, 'Normal': 0 };
    distSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      const p = distProds.find(pp => pp.id === data.productId);
      const reorderLevel = p ? p.reorderLevel : 0;
      if (data.quantity === 0) statusCount['Out of Stock']++;
      else if (data.quantity < reorderLevel) statusCount['Low Stock']++;
      else statusCount['Normal']++;
    });
    
    const stockDistribution = Object.keys(statusCount).map(k => ({ _id: k, count: statusCount[k as keyof typeof statusCount] }));

    // Requisition Trends
    let reqTQuery = adminDb.collection('requisitions').where('createdAt', '>=', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    if (warehouseId) {
      reqTQuery = reqTQuery.where('requestingWarehouseId', '==', warehouseId);
    }
    const rrSnap = await reqTQuery.get();
    
    const reqMap = new Map();
    rrSnap.docs.forEach(doc => {
      const data = doc.data();
      const date = data.createdAt.toDate();
      const m = date.getMonth() + 1;
      const y = date.getFullYear();
      const key = `${y}_${m}_${data.status}`;
      if (!reqMap.has(key)) {
        reqMap.set(key, { _id: { month: m, year: y, status: data.status }, count: 0 });
      }
      reqMap.get(key).count++;
    });
    
    const requisitionTrends = Array.from(reqMap.values()).sort((a, b) => {
      if (a._id.year !== b._id.year) return a._id.year - b._id.year;
      return a._id.month - b._id.month;
    });

    return NextResponse.json({
      stockTrends,
      topProducts,
      stockDistribution,
      requisitionTrends
    });

  } catch (error: any) {
    console.error('Dashboard analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
