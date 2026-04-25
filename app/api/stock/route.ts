import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const warehouseId = searchParams.get('warehouseId');
    const locationId = searchParams.get('locationId');

    if (!productId || !warehouseId) {
      return NextResponse.json({ error: 'productId and warehouseId are required' }, { status: 400 });
    }

    let query = adminDb.collection('stockLevels')
      .where('productId', '==', productId)
      .where('warehouseId', '==', warehouseId);

    if (locationId) {
      query = query.where('locationId', '==', locationId);
    }

    const snapshot = await query.limit(10).get(); 
    
    let stockLevel = null;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!locationId && data.locationId) {
        continue;
      }
      stockLevel = data;
      break;
    }

    return NextResponse.json({
      quantity: stockLevel?.quantity || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
