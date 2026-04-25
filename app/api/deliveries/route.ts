import { NextRequest, NextResponse } from 'next/server';
import { getCollection, addDocument, getDocument } from '@/lib/firebase/db';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';
import { generateReferenceNumber } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const requisitionId = searchParams.get('requisitionId');

    let deliveriesRef: any = adminDb.collection('deliveries');

    const userRole = session.user?.role;
    const assignedWarehouses = session.user?.assignedWarehouses || [];
    const primaryWarehouseId = session.user?.primaryWarehouseId;

    if (requisitionId) {
      deliveriesRef = deliveriesRef.where('requisitionId', '==', requisitionId);
    } else {
      if (userRole === 'OPERATOR' && assignedWarehouses.length > 0) {
        deliveriesRef = deliveriesRef.where('warehouseId', 'in', assignedWarehouses);
      } else if (userRole === 'MANAGER' && assignedWarehouses.length > 0) {
        // Manager logic requires an OR query across warehouseId and targetWarehouseId which Firebase doesn't support natively in a single query easily.
        // We'll fetch all matching either condition using two queries or do it in-memory.
        // Doing it in-memory by just fetching all deliveries or by performing two queries.
        // For simplicity and avoiding massive reads, we will default to fetching and filtering in memory below.
      } else if (warehouseId) {
        deliveriesRef = deliveriesRef.where('warehouseId', '==', warehouseId);
      }
    }

    if (status) {
      deliveriesRef = deliveriesRef.where('status', '==', status);
    }

    const snapshot = await deliveriesRef.limit(100).get();
    let deliveries = snapshot.docs.map((doc: any) => ({
      _id: doc.id,
      id: doc.id,
      ...doc.data(),
    }));

    // In-memory filters
    // 1. Manager Role OR conditions for warehouseId and targetWarehouseId
    if (!requisitionId && userRole === 'MANAGER' && assignedWarehouses.length > 0) {
      

    

    

    const managerWarehouseIds = primaryWarehouseId
        ? [primaryWarehouseId, ...assignedWarehouses]
        : assignedWarehouses;

      deliveries = deliveries.filter((d: any) => 
        managerWarehouseIds.includes(d.warehouseId) || managerWarehouseIds.includes(d.targetWarehouseId)
      );
    }

    // 2. Search filtering
    if (search && !requisitionId) {
      const searchLower = search.toLowerCase();
      deliveries = deliveries.filter((d: any) =>
        (d.deliveryNumber?.toLowerCase().includes(searchLower)) ||
        (d.reference?.toLowerCase().includes(searchLower)) ||
        (d.notes?.toLowerCase().includes(searchLower))
      );
    }

    // Sort descending
    deliveries.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

    // Populate relations
    const populatedDeliveries = await Promise.all(
      deliveries.map(async (delivery: any) => {
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
        
        return populateFields;
      })
    );

    return NextResponse.json(populatedDeliveries);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user?.role;
    const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];
    const primaryWarehouseId = (session.user as any)?.primaryWarehouseId;

    const body = await request.json();
    const {
      warehouseId,
      targetWarehouseId,
      customerName,
      requisitionId,
      reference,
      notes,
      lines,
      status,
      scheduleDate,
      responsible,
    } = body;

    // A delivery needs either a targetWarehouseId OR a customerName
    if (!warehouseId || (!targetWarehouseId && !customerName) || !lines || lines.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: warehouseId, (targetWarehouseId OR customerName), and lines are required' }, { status: 400 });
    }

    

    const managerWarehouseIds = primaryWarehouseId
      ? [primaryWarehouseId, ...assignedWarehouses]
      : assignedWarehouses;

    if (userRole === 'OPERATOR') {
      const hasAccess = assignedWarehouses.includes(warehouseId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have access to this warehouse' },
          { status: 403 }
        );
      }
    } else if (userRole === 'MANAGER') {
      const hasAccess = managerWarehouseIds.includes(warehouseId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have access to the source warehouse' },
          { status: 403 }
        );
      }
    }

    const warehouse = await getDocument<any>('warehouses', warehouseId);
    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    // Generate delivery number
    const sequenceId = Date.now() % 1000000;
    const deliveryNumber = generateReferenceNumber('WH', warehouse.code, 'OUT', sequenceId);

    const delivery = await addDocument('deliveries', {
      deliveryNumber,
      warehouseId,
      targetWarehouseId: targetWarehouseId || null,
      customerName: customerName || null,
      requisitionId: requisitionId || null,
      reference,
      notes,
      lines: lines.map((line: any) => ({
        productId: line.productId,
        fromLocationId: line.fromLocationId || null,
        quantity: line.quantity,
      })),
      status: status || 'DRAFT',
      scheduleDate: scheduleDate ? new Date(scheduleDate) : null,
      responsible: responsible || session.user.name,
      createdBy: session.user.id,
    });

    return NextResponse.json(delivery, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

