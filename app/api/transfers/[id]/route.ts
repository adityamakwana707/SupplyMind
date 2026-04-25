import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { updateStock } from '@/lib/services/stockService';
import { createShipmentForBusiness, validateCreateShipmentBody } from '@/lib/services/shipmentService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const transferDoc = await adminDb.collection('transfers').doc(id).get();
    if (!transferDoc.exists) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    const transferData = transferDoc.data() || {};
    const transfer: any = { id: transferDoc.id, _id: transferDoc.id, ...transferData };

    // Manual populate helper
    const populateField = async (collection: string, id: string, fields: string[]) => {
      if (!id) return null;
      try {
        const doc = await adminDb.collection(collection).doc(id).get();
        if (!doc.exists) return null;
        const data = doc.data() || {};
        const result: any = { _id: doc.id, id: doc.id };
        fields.forEach(f => { if (data[f]) result[f] = data[f]; });
        return result;
      } catch {
        return null;
      }
    };

    transfer.sourceWarehouseId = await populateField('warehouses', transfer.sourceWarehouseId?.toString(), ['name', 'code']);
    transfer.targetWarehouseId = await populateField('warehouses', transfer.targetWarehouseId?.toString(), ['name', 'code']);
    transfer.requisitionId = await populateField('requisitions', transfer.requisitionId?.toString(), ['requisitionNumber']);
    transfer.deliveryId = await populateField('deliveries', transfer.deliveryId?.toString(), ['deliveryNumber']);
    transfer.createdBy = await populateField('users', transfer.createdBy?.toString(), ['name', 'email']);
    transfer.validatedBy = await populateField('users', transfer.validatedBy?.toString(), ['name', 'email']);

    if (transfer.lines && Array.isArray(transfer.lines)) {
      transfer.lines = await Promise.all(transfer.lines.map(async (line: any) => {
        const newLine = { ...line };
        newLine.productId = await populateField('products', line.productId?.toString(), ['name', 'sku', 'unit']) || line.productId;
        newLine.sourceLocationId = await populateField('locations', line.sourceLocationId?.toString(), ['name', 'code']) || line.sourceLocationId;
        newLine.targetLocationId = await populateField('locations', line.targetLocationId?.toString(), ['name', 'code']) || line.targetLocationId;
        return newLine;
      }));
    }

    return NextResponse.json(transfer);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = session.user?.role;
    if (!['ADMIN', 'OPERATOR', 'MANAGER'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Forbidden. Role not permitted to edit transfers.' }, { status: 403 });
    }

    const transferRef = adminDb.collection('transfers').doc(id);
    const transferDoc = await transferRef.get();
    
    if (!transferDoc.exists) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    const transferData = transferDoc.data() || {};

    if (transferData.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Cannot update transfer that is not in DRAFT status' }, { status: 400 });
    }

    const assignedWarehouses = session.user?.assignedWarehouses || [];
    if (userRole === 'OPERATOR' && !assignedWarehouses.includes(transferData.sourceWarehouseId?.toString())) {
      return NextResponse.json({ error: 'You do not have access to edit this transfer' }, { status: 403 });
    }

    const body = await request.json();
    
    delete body._id;
    delete body.id;
    body.updatedAt = new Date();

    await transferRef.update(body);
    
    return NextResponse.json({ id, ...transferData, ...body });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = session.user?.role;
    const body = await request.json();
    const action = body.action || 'complete'; 

    const transferRef = adminDb.collection('transfers').doc(id);
    const transferDoc = await transferRef.get();
    
    if (!transferDoc.exists) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    const transferData = (transferDoc.data() || {}) as any;
    const userId = session.user?.id;
    const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];

    if (action === 'accept') {
      if (!['ADMIN', 'OPERATOR', 'MANAGER'].includes(userRole || '')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (transferData.status !== 'IN_TRANSIT') {
        return NextResponse.json({ error: 'Can only accept transfers in IN_TRANSIT status' }, { status: 400 });
      }

      if (userRole === 'OPERATOR') {
        const targetWarehouseStr = transferData.targetWarehouseId?.toString();
        const hasAccess = assignedWarehouses.some((whId: any) => String(whId) === targetWarehouseStr);
        if (!hasAccess) {
          return NextResponse.json({ error: 'You can only accept transfers for your assigned warehouse' }, { status: 403 });
        }
      }

      await adminDb.runTransaction(async (t) => {
        const docSnap = await t.get(transferRef);
        if (!docSnap.exists) throw new Error("Transfer not found");
        if (docSnap.data()?.status !== 'IN_TRANSIT') throw new Error("Status changed, aborting.");
        
        for (const line of (transferData.lines || [])) {
          await updateStock(
            line.productId?.toString(),
            transferData.targetWarehouseId?.toString(),
            line.targetLocationId?.toString(),
            line.quantity,
            t
          );

          const movementRef = adminDb.collection('stockMovements').doc();
          t.set(movementRef, {
            type: 'TRANSFER',
            reason: 'TRANSFER_IN',
            productId: line.productId,
            warehouseFromId: transferData.sourceWarehouseId,
            warehouseToId: transferData.targetWarehouseId,
            locationFromId: line.sourceLocationId || null,
            locationToId: line.targetLocationId || null,
            quantity: line.quantity,
            referenceId: id,
            createdBy: userId || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        t.update(transferRef, {
          status: 'DONE',
          validatedBy: userId || null,
          receivedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      return NextResponse.json({ success: true, message: 'Transfer accepted' });
    }

    if (!['ADMIN', 'OPERATOR', 'MANAGER'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (transferData.status === 'DONE') {
      return NextResponse.json({ error: 'Transfer already completed' }, { status: 400 });
    }

    if (transferData.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Transfer must be in DRAFT status to dispatch' }, { status: 400 });
    }

    if (userRole === 'OPERATOR') {
      const sourceWarehouseStr = transferData.sourceWarehouseId?.toString();
      const hasAccess = assignedWarehouses.some((whId: any) => String(whId) === sourceWarehouseStr);
      if (!hasAccess) {
        return NextResponse.json({ error: 'You do not have access to dispatch from this warehouse' }, { status: 403 });
      }
    }

    const { checkStockAvailability, getTotalStock } = await import('@/lib/services/stockService');
    
    // Execute transfer dispatch in atomic transaction
    await adminDb.runTransaction(async (t) => {
      const docSnap = await t.get(transferRef);
      if (!docSnap.exists) throw new Error("Transfer not found");
      if (docSnap.data()?.status !== 'DRAFT') throw new Error("Transfer is no longer in DRAFT status");
      
      const stockIssues: any[] = [];
      for (const line of (transferData.lines || [])) {
        let stockCheck = await checkStockAvailability(
          line.productId?.toString(),
          transferData.sourceWarehouseId?.toString(),
          line.sourceLocationId?.toString() || undefined,
          line.quantity,
          t
        );

        if (!stockCheck.isAvailable) {
          const totalStock = await getTotalStock(line.productId?.toString(), transferData.sourceWarehouseId?.toString(), t);
          if (totalStock >= line.quantity) {
             // Let it bypass only if it passes globally
             stockCheck = { isAvailable: true, currentStock: totalStock, shortage: 0 };
          }
        }

        if (!stockCheck.isAvailable) {
          stockIssues.push({
            productId: line.productId,
            quantity: line.quantity,
            available: stockCheck.currentStock,
          });
        }
      }

      if (stockIssues.length > 0) {
        throw new Error('Insufficient stock at source warehouse: ' + JSON.stringify(stockIssues));
      }

      for (const line of (transferData.lines || [])) {
        await updateStock(
          line.productId?.toString(),
          transferData.sourceWarehouseId?.toString(),
          line.sourceLocationId?.toString(),
          -(line.quantity),
          t
        );

        const movementRef = adminDb.collection('stockMovements').doc();
        t.set(movementRef, {
          type: 'TRANSFER',
          reason: 'TRANSFER_OUT',
          productId: line.productId,
          warehouseFromId: transferData.sourceWarehouseId,
          warehouseToId: transferData.targetWarehouseId,
          locationFromId: line.sourceLocationId || null,
          locationToId: line.targetLocationId || null,
          quantity: -(line.quantity),
          referenceId: id,
          createdBy: userId || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      t.update(transferRef, {
        status: 'IN_TRANSIT',
        dispatchedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    const businessId = (session.user as any)?.businessId;
    if (!businessId || typeof businessId !== 'string') {
      return NextResponse.json(
        { error: 'Transfer dispatched but shipment creation could not be scoped: missing businessId in session.' },
        { status: 400 }
      );
    }

    const fallbackEtaIso = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const shipmentPayload = {
      type: 'TRANSFER',
      linkedDocumentId: id,
      linkedDocumentType: 'TRANSFER',
      origin: { type: 'WAREHOUSE', id: transferData.sourceWarehouseId?.toString() },
      destination: { type: 'WAREHOUSE', id: transferData.targetWarehouseId?.toString() },
      vehicleType: 'TRUCK',
      cargo: (transferData.lines || []).map((line: any) => ({
        productId: line.productId?.toString(),
        quantity: Number(line.quantity)
      })),
      eta: transferData.eta ? new Date(transferData.eta).toISOString() : fallbackEtaIso
    };

    const validation = validateCreateShipmentBody(shipmentPayload);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Transfer dispatched but shipment creation payload validation failed.',
          transferId: id,
      shipmentCreationError: validation.error
        },
        { status: 502 }
      );
    }

    const createdShipment = await createShipmentForBusiness(businessId, validation.data);
    await transferRef.update({
      shipmentId: createdShipment.id || createdShipment._id || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return NextResponse.json({ success: true, message: 'Transfer dispatched' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
