import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb, admin } from '@/lib/firebase/admin';
import { getDocument } from '@/lib/firebase/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const productId = searchParams.get('productId');

    let query: admin.firestore.Query = adminDb.collection('adjustments');

    // For Operators, filter by assigned warehouses
    const userRole = session.user?.role;
    const assignedWarehouses = session.user?.assignedWarehouses || [];
    
    if (userRole === 'OPERATOR' && assignedWarehouses.length > 0) {
      query = query.where('warehouseId', 'in', assignedWarehouses);
    } else if (warehouseId) {
      query = query.where('warehouseId', '==', warehouseId);
    }

    if (productId) {
      query = query.where('productId', '==', productId);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').limit(100).get();

    const adjustments = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        const [product, warehouse, location, createdBy] = await Promise.all([
          data.productId ? getDocument<any>('products', data.productId) : null,
          data.warehouseId ? getDocument<any>('warehouses', data.warehouseId) : null,
          data.locationId ? getDocument<any>('locations', data.locationId) : null,
          data.createdBy ? getDocument<any>('users', data.createdBy) : null,
        ]);

        return {          _id: doc.id,          id: doc.id,
          ...data,
          productId: product || { id: data.productId },
          warehouseId: warehouse || { id: data.warehouseId },
          locationId: location || { id: data.locationId },
          createdBy: createdBy || { id: data.createdBy },
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
        };
      })
    );

    return NextResponse.json(adjustments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { productId, warehouseId, locationId, newQuantity, reason, remarks } = body;

    if (!productId || !warehouseId || newQuantity === undefined || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // For Operators, verify they have access to this warehouse
    const userRole = session.user?.role;
    const assignedWarehouses = session.user?.assignedWarehouses || [];
    if (userRole === 'OPERATOR' && !assignedWarehouses.includes(warehouseId)) {
      return NextResponse.json(
        { error: 'You do not have access to this warehouse' },
        { status: 403 }
      );
    }

    // Generate adjustment number using timestamp and random fallback to avoid race collisions
    const timestampMs = Date.now();
    const fallbackId = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const adjustmentNumber = `ADJ-${timestampMs}-${fallbackId}`;

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const userId = session.user.id; 

    // Execute in transaction to ensure stock levels and movements match
    const adjustmentRefDoc = adminDb.collection('adjustments').doc();
    let populatedAdjustment: any = null;

    await adminDb.runTransaction(async (t) => {
      let stockQuery = adminDb.collection('stockLevels')
        .where('productId', '==', productId)
        .where('warehouseId', '==', warehouseId);
        
      if (locationId) {
        stockQuery = stockQuery.where('locationId', '==', locationId);
      }

      const stockSnapshot = await t.get(stockQuery);
      let oldQuantity = 0;
      let stockLevelDocRef = stockSnapshot.empty ? adminDb.collection('stockLevels').doc() : stockSnapshot.docs[0].ref;

      if (!stockSnapshot.empty) {
        oldQuantity = stockSnapshot.docs[0].data().quantity || 0;
      }

      const difference = newQuantity - oldQuantity;

      const adjustmentData = {
        adjustmentNumber,
        productId,
        warehouseId,
        locationId: locationId || null,
        oldQuantity,
        newQuantity,
        difference,
        reason,
        remarks,
        createdBy: userId,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      t.set(adjustmentRefDoc, adjustmentData);

      if (stockSnapshot.empty) {
        t.set(stockLevelDocRef, {
          productId,
          warehouseId,
          locationId: locationId || null,
          quantity: newQuantity,
          lastUpdated: timestamp
        });
      } else {
        t.update(stockLevelDocRef, {
          quantity: newQuantity,
          lastUpdated: timestamp
        });
      }

      const movementRef = adminDb.collection('stockMovements').doc();
      t.set(movementRef, {
        type: 'ADJUSTMENT',
        reason: 'ADJUSTMENT',
        productId,
        warehouseFromId: warehouseId,
        warehouseToId: warehouseId,
        locationFromId: locationId || null,
        locationToId: locationId || null,
        quantity: difference,
        referenceId: adjustmentRefDoc.id,
        createdBy: userId,
        createdAt: timestamp
      });
      
      populatedAdjustment = {
        id: adjustmentRefDoc.id,
        ...adjustmentData
      };
    });

    populatedAdjustment.productId = await getDocument<any>('products', productId);
    populatedAdjustment.warehouseId = await getDocument<any>('warehouses', warehouseId);
    populatedAdjustment.locationId = locationId ? await getDocument<any>('locations', locationId) : null;
    populatedAdjustment.createdBy = await getDocument<any>('users', userId);
    populatedAdjustment.createdAt = new Date();

    return NextResponse.json(populatedAdjustment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
