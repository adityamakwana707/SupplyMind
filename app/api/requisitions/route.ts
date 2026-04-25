import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';
import { getDocument } from '@/lib/firebase/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const userRole = session.user.role;
    const assignedWarehouses = session.user.assignedWarehouses || [];
    
    let requisitionsRef: any = adminDb.collection('requisitions');
    let requisitionsSnapshot = await requisitionsRef.orderBy('createdAt', 'desc').limit(100).get();
    let requisitions = requisitionsSnapshot.docs.map((doc: any) => ({ _id: doc.id, ...doc.data() }));

    // Memory Filtering
    requisitions = requisitions.filter((req: any) => {
      let isMatch = true;

      // Role check
      if (userRole === 'OPERATOR' && assignedWarehouses.length > 0) {
        if (!assignedWarehouses.includes(req.requestingWarehouseId)) isMatch = false;
      } else if (warehouseId) {
        if (req.requestingWarehouseId !== warehouseId) isMatch = false;
      }

      if (status && req.status !== status) isMatch = false;

      if (search && !(req.requisitionNumber && req.requisitionNumber.toLowerCase().includes(search.toLowerCase()))) {
        isMatch = false;
      }

      return isMatch;
    });

    // Populate lookup references
    requisitions = await Promise.all(
      requisitions.map(async (r: any) => {
        const [requestingWarehouse, suggestedWarehouse, finalWarehouse, createdByUser] = await Promise.all([
          r.requestingWarehouseId ? getDocument('warehouses', r.requestingWarehouseId) : null,
          r.suggestedSourceWarehouseId ? getDocument('warehouses', r.suggestedSourceWarehouseId) : null,
          r.finalSourceWarehouseId ? getDocument('warehouses', r.finalSourceWarehouseId) : null,
          r.createdBy ? getDocument('users', r.createdBy) : null,
        ]);

        return {
          ...r,
          requestingWarehouseId: requestingWarehouse || r.requestingWarehouseId,
          suggestedSourceWarehouseId: suggestedWarehouse || r.suggestedSourceWarehouseId,
          finalSourceWarehouseId: finalWarehouse || r.finalSourceWarehouseId,
          createdBy: createdByUser || r.createdBy,
        };
      })
    );

    return NextResponse.json(requisitions);
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
      requestingWarehouseId,
      suggestedSourceWarehouseId,
      lines,
      status,
    } = await request.json();

    const userRole = session.user.role;
    if (userRole !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const assignedWarehouses = session.user.assignedWarehouses || [];
    const primaryWarehouseId = session.user.primaryWarehouseId;
    
    let targetReqWarehouseId = requestingWarehouseId;
    if (!targetReqWarehouseId) {
      targetReqWarehouseId = primaryWarehouseId || (assignedWarehouses.length > 0 ? assignedWarehouses[0] : null);
    }

    if (!targetReqWarehouseId || !lines || lines.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const managerWarehouseIds = primaryWarehouseId 
      ? [primaryWarehouseId, ...assignedWarehouses]
      : assignedWarehouses;
    
    const hasAccess = managerWarehouseIds.includes(targetReqWarehouseId);
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this warehouse' },
        { status: 403 }
      );
    }

    const warehouseDoc = await adminDb.collection('warehouses').doc(targetReqWarehouseId).get();
    if (!warehouseDoc.exists) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    const sequenceId = Date.now() % 1000000;
    const requisitionNumber = `REQ-${sequenceId.toString().padStart(6, '0')}`;

    const requisitionRef = await adminDb.collection('requisitions').add({
      requisitionNumber,
      requestingWarehouseId: targetReqWarehouseId,
      suggestedSourceWarehouseId: suggestedSourceWarehouseId || null,
      lines: lines.map((line: any) => ({
        productId: line.productId,
        quantityRequested: line.quantityRequested,
        neededByDate: line.neededByDate ? new Date(line.neededByDate) : null,
      })),
      status: 'SUBMITTED', // Auto-submit on creation
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedDoc = await requisitionRef.get();

    return NextResponse.json({ _id: savedDoc.id, ...savedDoc.data() }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

