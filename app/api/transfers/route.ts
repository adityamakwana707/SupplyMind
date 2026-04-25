import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';
import { getDocument, getCollection } from '@/lib/firebase/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const warehouseIds = searchParams.getAll('warehouseId');
    const status = searchParams.get('status');

    let transfersRef: any = adminDb.collection('transfers');

    const userRole = session.user.role;
    const assignedWarehouses = session.user.assignedWarehouses || [];

    // Basic queries without Mongoose
    let transfersSnapshot = await transfersRef.orderBy('createdAt', 'desc').limit(100).get();
    let transfers = transfersSnapshot.docs.map((doc: any) => ({ _id: doc.id, id: doc.id, ...doc.data() }));

    // Apply filtering in memory (due to Firestore complex OR constraints)
    transfers = transfers.filter((t: any) => {
      let isMatch = true;

      if (userRole === 'OPERATOR' && assignedWarehouses.length > 0 && warehouseIds.length === 0) {
        isMatch = assignedWarehouses.includes(t.sourceWarehouseId) || assignedWarehouses.includes(t.targetWarehouseId);
      } else if (warehouseIds.length > 0) {
        isMatch = warehouseIds.includes(t.sourceWarehouseId) || warehouseIds.includes(t.targetWarehouseId);
      }

      if (status && t.status !== status) {
        isMatch = false;
      }

      return isMatch;
    });

    // Manual population
    transfers = await Promise.all(
      transfers.map(async (t: any) => {
        const [sourceWarehouse, targetWarehouse, createdByUser] = await Promise.all([
          t.sourceWarehouseId ? getDocument<any>('warehouses', t.sourceWarehouseId) : null,
          t.targetWarehouseId ? getDocument<any>('warehouses', t.targetWarehouseId) : null,
          t.createdBy ? getDocument<any>('users', t.createdBy) : null,
        ]);

        return {
          ...t,
          sourceWarehouseId: sourceWarehouse || t.sourceWarehouseId,
          targetWarehouseId: targetWarehouse || t.targetWarehouseId,
          createdBy: createdByUser || t.createdBy,
        };
      })
    );

    return NextResponse.json(transfers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      requisitionId,
      deliveryId,
      sourceWarehouseId,
      targetWarehouseId,
      lines,
      status,
    } = await request.json();

    const userRole = session.user.role;
    if (userRole !== 'OPERATOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (deliveryId) {
      const deliveryDoc = await adminDb.collection('deliveries').doc(deliveryId).get();

      if (!deliveryDoc.exists) {
        return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
      }

      const delivery = deliveryDoc.data()!;

      if (delivery.status !== 'READY') {
        return NextResponse.json(
          { error: 'Delivery must be in READY status to create transfer' },
          { status: 400 }
        );
      }

      const assignedWarehouses = session.user.assignedWarehouses || [];
      const hasAccess = assignedWarehouses.includes(delivery.warehouseId);
      
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have access to the source warehouse' },
          { status: 403 }
        );
      }

      const sequenceId = Date.now() % 1000000;
      const transferNumber = `TRF-${sequenceId.toString().padStart(6, '0')}`;

      const transferRef = await adminDb.collection('transfers').add({
        transferNumber,
        requisitionId: delivery.requisitionId || null,
        deliveryId: deliveryId,
        sourceWarehouseId: delivery.warehouseId,
        targetWarehouseId: delivery.targetWarehouseId || targetWarehouseId,
        lines: delivery.lines.map((line: any) => ({
          productId: line.productId,
          quantity: line.quantity,
        })),
        status: 'DRAFT',
        createdBy: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const newTransferDoc = await transferRef.get();
      return NextResponse.json({ _id: newTransferDoc.id, ...newTransferDoc.data() }, { status: 201 });
    }

    // Default branch
    const sequenceId = Date.now() % 1000000;
    const transferNumber = `TRF-${sequenceId.toString().padStart(6, '0')}`;

    const transferRef = await adminDb.collection('transfers').add({
      transferNumber,
      sourceWarehouseId,
      targetWarehouseId,
      lines,
      status: 'DRAFT',
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const newTransferDoc = await transferRef.get();
    return NextResponse.json({ _id: newTransferDoc.id, ...newTransferDoc.data() }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }


}
