import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { getDocument, updateDocument } from '@/lib/firebase/db';
import * as admin from 'firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const delivery = await getDocument<any>('deliveries', id);
    if (!delivery) return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });

    const populateFields: any = { ...delivery };
    try {
      if (delivery.warehouseId) {
        const wh = await getDocument<any>('warehouses', delivery.warehouseId);
        if (wh) populateFields.warehouseId = { _id: wh.id, id: wh.id, name: wh.name, code: wh.code };
      }
      if (delivery.targetWarehouseId) {
        const wh = await getDocument<any>('warehouses', delivery.targetWarehouseId);
        if (wh) populateFields.targetWarehouseId = { _id: wh.id, id: wh.id, name: wh.name, code: wh.code };
      }
      if (delivery.requisitionId) {
        const req = await getDocument<any>('requisitions', delivery.requisitionId);
        if (req) populateFields.requisitionId = { _id: req.id, id: req.id, requisitionNumber: req.requisitionNumber };
      }
      if (delivery.createdBy) {
        const user = await getDocument<any>('users', delivery.createdBy);
        if (user) populateFields.createdBy = { _id: user.id, id: user.id, name: user.name, email: user.email };
      }
      if (delivery.acceptedBy) {
        const user = await getDocument<any>('users', delivery.acceptedBy);
        if (user) populateFields.acceptedBy = { _id: user.id, id: user.id, name: user.name, email: user.email };
      }

      populateFields.lines = await Promise.all((delivery.lines || []).map(async (line: any) => {
        const populatedLine = { ...line };
        if (line.productId) {
          const p = await getDocument<any>('products', line.productId);
          if (p) populatedLine.productId = { _id: p.id, id: p.id, name: p.name, sku: p.sku };
        }
        if (line.fromLocationId) {
          const l = await getDocument<any>('locations', line.fromLocationId);
          if (l) populatedLine.fromLocationId = { _id: l.id, id: l.id, name: l.name, code: l.code };
        }
        return populatedLine;
      }));
    } catch (e) {
      console.error("Error populating delivery", e);
    }

    return NextResponse.json(populateFields);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const delivery = await getDocument<any>('deliveries', id);
    if (!delivery) return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });

    if (delivery.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot update delivery that is not in DRAFT status' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updateData = { ...body, updatedAt: new Date().toISOString() };
    await updateDocument('deliveries', id, updateData);

    const updated = await getDocument<any>('deliveries', id);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const userRole = session.user?.role;
    const body = await request.json();
    const action = body.action || 'validate';

    const delivery = await getDocument<any>('deliveries', id);
    if (!delivery) return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });

    if (action === 'approve') {
      if (userRole !== 'MANAGER' && userRole !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (delivery.status !== 'WAITING') {
        return NextResponse.json({ error: 'Can only approve deliveries in WAITING status' }, { status: 400 });
      }

      const updateData = {
        status: 'READY',
        acceptedBy: session.user?.id,
        acceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await updateDocument('deliveries', id, updateData);
      
      const updated = await getDocument<any>('deliveries', id);
      return NextResponse.json(updated);
    }

    if (action === 'reject') {
      if (userRole !== 'MANAGER' && userRole !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (delivery.status !== 'WAITING') {
        return NextResponse.json({ error: 'Can only reject deliveries in WAITING status' }, { status: 400 });
      }

      const rejectReason = body.reason || 'Rejected by manager';
      const notes = delivery.notes ? `${delivery.notes}\nRejected: ${rejectReason}` : `Rejected: ${rejectReason}`;

      const updateData = {
        status: 'REJECTED',
        notes,
        updatedAt: new Date().toISOString()
      };

      await updateDocument('deliveries', id, updateData);

      const updated = await getDocument<any>('deliveries', id);
      return NextResponse.json(updated);
    }

    if (action === 'validate') {
      if (delivery.status !== 'READY' && delivery.status !== 'DRAFT') {
        return NextResponse.json({ error: 'Delivery cannot be validated from current status' }, { status: 400 });
      }

      const { adminDb } = await import('@/lib/firebase/admin');
      const stockService = await import('@/lib/services/stockService');

      await adminDb.runTransaction(async (t) => {
        const docRef = adminDb.collection('deliveries').doc(id);
        const docSnap = await t.get(docRef);
        if (!docSnap.exists) throw new Error("Delivery not found");
        if (docSnap.data()?.status !== 'READY' && docSnap.data()?.status !== 'DRAFT') {
           throw new Error("Delivery status changed outside transaction");
        }

        const stockIssues: any[] = [];
        for (const line of delivery.lines) {
          let stockCheck = await stockService.checkStockAvailability(
            line.productId?.toString(),
            delivery.warehouseId?.toString(),
            line.fromLocationId?.toString() || undefined,
            line.quantity,
            t
          );

          if (!stockCheck.isAvailable) {
            stockIssues.push({
              productId: line.productId,
              quantity: line.quantity,
              available: stockCheck.currentStock,
            });
          }
        }

        if (stockIssues.length > 0) {
          throw new Error('Insufficient stock for delivery: ' + JSON.stringify(stockIssues));
        }

        for (const line of delivery.lines) {
          await stockService.updateStock(
            line.productId?.toString(),
            delivery.warehouseId?.toString(),
            line.fromLocationId?.toString() || undefined,
            -(line.quantity),
            t
          );

          const movementRef = adminDb.collection('stockMovements').doc();
          t.set(movementRef, {
            type: 'DELIVERY',
            reason: 'DELIVERY',
            productId: line.productId,
            warehouseFromId: delivery.warehouseId,
            warehouseToId: null,
            locationFromId: line.fromLocationId || null,
            locationToId: null,
            quantity: -(line.quantity),
            referenceId: id,
            createdBy: session.user?.id || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        const shipmentRef = adminDb.collection('shipments').doc();
        t.set(shipmentRef, {
          type: 'OUTBOUND',
          linkedDocumentId: id,
          linkedDocumentType: 'DELIVERY',
          origin: { type: 'WAREHOUSE', warehouseId: delivery.warehouseId },
          destination: delivery.targetWarehouseId 
                         ? { type: 'WAREHOUSE', warehouseId: delivery.targetWarehouseId }
                         : { type: 'ADDRESS', address: 'Customer Address' },
          cargo: (delivery.lines || []).map((l: any) => ({ productId: l.productId, quantity: l.quantity })),
          status: 'DISPATCHED',
          riskScore: 0,
          riskHistory: [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        t.update(docRef, {
          status: 'DONE',
          shipmentId: shipmentRef.id,
          validatedBy: session.user?.id || null,
          validatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      const updated = await getDocument<any>('deliveries', id);
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
