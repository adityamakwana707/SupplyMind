import { adminDb } from '../firebase/admin';

export async function getDashboardData(warehouseId?: string) {
  try {
    // Total SKUs
    const productsSnapshot = await adminDb.collection('products').where('isActive', '==', true).get();
    const totalSKUs = productsSnapshot.size;

    let lowStockCount = 0;
    
    for (const doc of productsSnapshot.docs) {
      const product = doc.data();
      let totalQuantity = 0;
      
      const stockLevelsRef = adminDb.collection('stockLevels').where('productId', '==', doc.id);
      const stockLevelsSnapshot = warehouseId ? 
        await stockLevelsRef.where('warehouseId', '==', warehouseId).get() :
        await stockLevelsRef.get();
        
      totalQuantity = stockLevelsSnapshot.docs.reduce((sum, slDoc) => sum + (slDoc.data().quantity || 0), 0);
      
      const minStockLevel = product.reorderLevel || 0;
      if (totalQuantity <= minStockLevel) {
        lowStockCount++;
      }
    }

    // Pending Requisitions
    let reqRef: any = adminDb.collection('requisitions').where('status', '==', 'SUBMITTED');
    if (warehouseId) {
      reqRef = reqRef.where('requestingWarehouseId', '==', warehouseId);
    }
    const requisitionsSnapshot = await reqRef.get();
    const pendingRequisitions = requisitionsSnapshot.size;

    // Active Transfers
    let transRef: any = adminDb.collection('transfers').where('status', '==', 'DRAFT');
    const transfersSnapshot = await transRef.get();
    let pendingTransfers = transfersSnapshot.size;
    if (warehouseId) {
      pendingTransfers = transfersSnapshot.docs.filter((doc: any) => {
        const d = doc.data();
        return d.sourceWarehouseId === warehouseId || d.targetWarehouseId === warehouseId;
      }).length;
    }

    // Intelligence Metrics
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const moveSnap = await adminDb.collection('stockMovements').where('createdAt', '>=', ninetyDaysAgo).get();
    const activePids = new Set(moveSnap.docs.map(d => d.data().productId));
    
    let stockLevelsSnap;
    if (warehouseId) {
      stockLevelsSnap = await adminDb.collection('stockLevels').where('warehouseId', '==', warehouseId).get();
    } else {
      stockLevelsSnap = await adminDb.collection('stockLevels').get();
    }
    const stockLevels = stockLevelsSnap.docs.map(doc => doc.data());
    const stockPids = new Set(stockLevels.map(sl => sl.productId));
    
    let slowDeadStockCount = 0;
    for (const pid of stockPids) {
      if (!activePids.has(pid)) {
        slowDeadStockCount++;
      }
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // We fetch all stockMovements once and handle intelligence and recent activity in memory
    // to avoid composite index requirements on (type, createdAt).
    const allMovementsSnap = await adminDb.collection('stockMovements').get();
    const allMovementsData = allMovementsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const stockoutEvents = allMovementsData.filter((m: any) => {
        const mDate = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
        return m.type === 'DELIVERY' && mDate >= thirtyDaysAgo;
    }).length;

    // Recent Activity (Top 5)
    const recentMovementsRaw = [...allMovementsData].sort((a: any, b: any) => {
        const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime();
        const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime();
        return dateB - dateA;
    }).slice(0, 5);

    const recentActivity: any[] = [];
    for(const item of recentMovementsRaw) {
      const data = item as any;
      let productName = 'Unknown Product';
      if (data.productId) {
         const pDoc = await adminDb.collection('products').doc(data.productId).get();
         if (pDoc.exists) {
            productName = pDoc.data()?.name || 'Unknown Product';
         }
      }
      recentActivity.push({
        id: data.id,
        type: data.type,
        quantity: data.quantity,
        date: data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString(),
        productName: productName
      });
    }

    // --- NEW EXECUTIVE INTELLIGENCE METRICS ---
    const activeShipmentsSnap = await adminDb.collection('shipments')
      .where('status', 'in', ['IN_TRANSIT', 'DISPATCHED'])
      .get();
      
    let revenueAtRisk = 0;
    const vendorCounts: Record<string, number> = {};
    const highRiskProductIds = new Set<string>();
    
    activeShipmentsSnap.docs.forEach(doc => {
      const sh = doc.data();
      const vendor = sh.origin?.vendorId || 'Unknown';
      vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
      
      if (sh.riskScore >= 65) {
        // Calculate cargo value: quantity * assumed average value ($150 per unit for pharma context)
        const cargoValue = (sh.cargo || []).reduce((acc: number, item: any) => acc + (item.quantity * 150), 0);
        revenueAtRisk += cargoValue;
        sh.cargo?.forEach((item: any) => highRiskProductIds.add(item.productId));
      }
    });

    // Compute Diversification Index (Simple HHI proxy: 100 - Concentration%)
    const totalActive = activeShipmentsSnap.size || 1;
    const maxVendorCount = Math.max(...Object.values(vendorCounts), 0);
    const vendorDiversificationIndex = Math.round(100 - (maxVendorCount / totalActive * 100));

    // Impacted Orders (Pending requisitions that depend on items in high-risk shipments)
    let impactedOrdersCount = 0;
    for (const doc of requisitionsSnapshot.docs) {
      const req = doc.data();
      const isImpacted = (req.items || []).some((item: any) => highRiskProductIds.has(item.productId));
      if (isImpacted) impactedOrdersCount++;
    }

    return {
      totalSKUs,
      lowStockCount,
      pendingRequisitions,
      pendingTransfers,
      slowDeadStockCount,
      stockoutEvents,
      recentActivity,
      revenueAtRisk,
      impactedOrdersCount,
      vendorDiversificationIndex
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return {
      totalSKUs: 0,
      lowStockCount: 0,
      pendingRequisitions: 0,
      pendingTransfers: 0,
      slowDeadStockCount: 0,
      stockoutEvents: 0,
      recentActivity: [],
      revenueAtRisk: 0,
      impactedOrdersCount: 0,
      vendorDiversificationIndex: 0
    };
  }
}
