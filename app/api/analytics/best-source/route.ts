import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const excludeWarehouseId = searchParams.get('excludeWarehouseId');

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    let query = adminDb.collection('stockLevels').where('productId', '==', productId).where('quantity', '>', 0);
    const stockSnap = await query.get();
    
    let stockLevels = stockSnap.docs.map(d => d.data());
    if (excludeWarehouseId) {
      stockLevels = stockLevels.filter(sl => sl.warehouseId !== excludeWarehouseId);
    }

    const warehouseStock: Record<string, any> = {};
    for (const stockLevel of stockLevels) {
      const wid = stockLevel.warehouseId;
      if (!warehouseStock[wid]) {
        const wDoc = await adminDb.collection('warehouses').doc(wid).get();
        const wData = wDoc.data() || {};
        warehouseStock[wid] = {
          warehouseId: wid,
          warehouseName: wData.name,
          warehouseCode: wData.code,
          totalQuantity: 0,
        };
      }
      warehouseStock[wid].totalQuantity += stockLevel.quantity;
    }

    const suggestions = Object.values(warehouseStock).sort((a: any, b: any) => b.totalQuantity - a.totalQuantity);

    return NextResponse.json({
      productId,
      suggestions,
      bestSource: suggestions.length > 0 ? suggestions[0] : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
