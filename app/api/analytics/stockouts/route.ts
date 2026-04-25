import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stSnap = await adminDb.collection('stockMovements')
      .where('type', '==', 'DELIVERY')
      .where('createdAt', '>=', startDate)
      .get();
      
    const deliveryMovements = stSnap.docs.map(d => d.data());
    deliveryMovements.sort((a,b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());

    const productsMap: { [key: string]: any } = {};
    for (const movement of deliveryMovements) {
      const productId = movement.productId;
      if (!productsMap[productId]) {
        // fetch product to get name and sku
        const pDoc = await adminDb.collection('products').doc(productId).get();
        const pData = pDoc.data() || {};
        productsMap[productId] = {
          productId: productId,
          productName: pData.name,
          sku: pData.sku,
          count: 0,
          lastEvent: movement.createdAt.toDate(),
        };
      }
      productsMap[productId].count++;
      const moveDate = movement.createdAt.toDate();
      if (moveDate > productsMap[productId].lastEvent) {
        productsMap[productId].lastEvent = moveDate;
      }
    }

    const events = Object.values(productsMap).sort((a: any, b: any) => b.count - a.count);

    return NextResponse.json({
      events,
      totalEvents: events.length,
      periodDays: days,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
