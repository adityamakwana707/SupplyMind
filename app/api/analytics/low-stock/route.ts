import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb, admin } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');

    const productsSnap = await adminDb.collection('products').where('isActive', '==', true).get();
    
    let stockQuery: admin.firestore.Query = adminDb.collection('stockLevels');
    if (warehouseId) {
      stockQuery = stockQuery.where('warehouseId', '==', warehouseId);
    }
    const stockSnap = await stockQuery.get();
    const stockLevels = stockSnap.docs.map(doc => doc.data());

    const lowStockItems: any[] = [];

    productsSnap.docs.forEach(pDoc => {
      const product = pDoc.data();
      const pStock = stockLevels.filter(sl => sl.productId === pDoc.id);
      const totalQuantity = pStock.reduce((sum, sl) => sum + (sl.quantity || 0), 0);

      if (totalQuantity < (product.reorderLevel || 0)) {
        lowStockItems.push({
          productId: pDoc.id,
          productName: product.name,
          sku: product.sku,
          currentStock: totalQuantity,
          reorderLevel: product.reorderLevel,
          deficit: product.reorderLevel - totalQuantity,
        });
      }
    });

    return NextResponse.json({ lowStockItems, count: lowStockItems.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
