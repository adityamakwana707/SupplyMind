import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb, admin } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const categoryFilter = searchParams.get('category');

    const productsSnap = await adminDb.collection('products').where('isActive', '==', true).get();
    const products: any[] = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    let stockQuery: admin.firestore.Query = adminDb.collection('stockLevels');
    if (warehouseId) {
      stockQuery = stockQuery.where('warehouseId', '==', warehouseId);
    }
    const stockSnap = await stockQuery.get();
    const stockLevels = stockSnap.docs.map(doc => doc.data());

    // Get all movements to avoid N+1 queries. Can be optimized if DB is huge, but doing JS merge here.
    const moveSnap = await adminDb.collection('stockMovements').get();
    const movements: any[] = moveSnap.docs.map(d => ({id: d.id, ...d.data()}));

    const stockHealth: any[] = [];

    for (const product of products) {
      const pStock = stockLevels.filter(sl => sl.productId === product.id);
      
      for (const stockLevel of pStock) {
        // find last movement
        const productMoves = movements.filter(m => m.productId === product.id && 
          (m.warehouseFromId === stockLevel.warehouseId || m.warehouseToId === stockLevel.warehouseId)
        );
        productMoves.sort((a,b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
        const lastMovement = productMoves.length > 0 ? productMoves[0] : null;

        const daysSinceLastMovement = lastMovement
          ? Math.floor((Date.now() - lastMovement.createdAt.toDate().getTime()) / (1000 * 60 * 60 * 24))
          : null;

        let category = 'UNKNOWN';
        if (daysSinceLastMovement === null) {
          category = 'NO_MOVEMENT';
        } else if (daysSinceLastMovement < 30) {
          category = 'ACTIVE';
        } else if (daysSinceLastMovement < 90) {
          category = 'SLOW';
        } else {
          category = 'DEAD';
        }

        stockHealth.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          warehouseId: stockLevel.warehouseId,
          locationId: stockLevel.locationId,
          quantity: stockLevel.quantity,
          daysSinceLastMovement,
          category,
        });
      }
    }

    const filtered = categoryFilter
      ? stockHealth.filter((item) => item.category === categoryFilter)
      : stockHealth;

    return NextResponse.json({
      stockHealth: filtered,
      summary: {
        active: filtered.filter((item) => item.category === 'ACTIVE').length,
        slow: filtered.filter((item) => item.category === 'SLOW').length,
        dead: filtered.filter((item) => item.category === 'DEAD').length,
        noMovement: filtered.filter((item) => item.category === 'NO_MOVEMENT').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
