import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { generateReferenceNumber } from '@/lib/utils';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSessionFirebase();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const docRef = adminDb.collection('requisitions').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const requisitionData = docSnap.data();

    // Function to fetch ref and merge
    const populateFetch = async (col: string, id: string | null) => {
        if (!id) return null;
        const d = await adminDb.collection(col).doc(id).get();
        if (d.exists) return { _id: d.id, id: d.id, ...d.data() };
        return null;
    };

    let reqWithId: any = { _id: docSnap.id, id: docSnap.id, ...requisitionData };
    reqWithId.requestingWarehouseId = await populateFetch('warehouses', reqWithId.requestingWarehouseId);
    reqWithId.suggestedSourceWarehouseId = await populateFetch('warehouses', reqWithId.suggestedSourceWarehouseId);
    reqWithId.finalSourceWarehouseId = await populateFetch('warehouses', reqWithId.finalSourceWarehouseId);
    reqWithId.createdBy = await populateFetch('users', reqWithId.createdBy);
    reqWithId.approvedBy = await populateFetch('users', reqWithId.approvedBy);

    if (reqWithId.lines && Array.isArray(reqWithId.lines)) {
      for (const line of reqWithId.lines) {
         if (line.productId) {
            line.productId = await populateFetch('products', line.productId);
         }
      }
    }

    if (reqWithId.status === 'APPROVED') {
      const delQuery = await adminDb.collection('deliveries').where('requisitionId', '==', docSnap.id).get();
      if (!delQuery.empty) {
        const delDoc = delQuery.docs[0];
        let delObj = { _id: delDoc.id, id: delDoc.id, ...delDoc.data() } as any;
        delObj.warehouseId = await populateFetch('warehouses', delObj.warehouseId);
        delObj.targetWarehouseId = await populateFetch('warehouses', delObj.targetWarehouseId);
        delObj.requisitionId = { _id: docSnap.id, requisitionNumber: reqWithId.requisitionNumber };
        delObj.createdBy = await populateFetch('users', delObj.createdBy);
        
        if (delObj.lines && Array.isArray(delObj.lines)) {
          for (const line of delObj.lines) {
             if (line.productId) line.productId = await populateFetch('products', line.productId);
          }
        }
        
        return NextResponse.json({
          ...reqWithId,
          delivery: delObj
        });
      }
    }

    return NextResponse.json(reqWithId);
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

    const docRef = adminDb.collection('requisitions').doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    if (docSnap.data()!.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot update requisition that is not in DRAFT status' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    const updateData = { ...body, updatedAt: FieldValue.serverTimestamp() };
    delete updateData._id;
    await docRef.update(updateData);

    const updatedSnap = await docRef.get();
    return NextResponse.json({ _id: updatedSnap.id, id: updatedSnap.id, ...updatedSnap.data() });
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

    const userRole = (session.user as any)?.role;
    const body = await request.json();
    const action = body.action;

    const docRef = adminDb.collection('requisitions').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Requisition not found' }, { status: 404 });
    }

    const requisition = docSnap.data();
    const userId = (session.user as any).id;

    if (action === 'approve') {
      if (userRole !== 'MANAGER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (requisition!.status !== 'SUBMITTED') {
        return NextResponse.json({ error: 'Can only approve SUBMITTED requisitions' }, { status: 400 });
      }

      const finalSourceWarehouseId = body.finalSourceWarehouseId || null;
      if (!finalSourceWarehouseId) {
        return NextResponse.json({ error: 'Final source warehouse is required for approval' }, { status: 400 });
      }

      const assignedWarehouses = (session.user as any)?.assignedWarehouses || [];
      const hasAccess = assignedWarehouses.some((whId: any) => String(whId) === String(finalSourceWarehouseId));
      
      if (!hasAccess) {
        return NextResponse.json({ error: 'You can only approve requisitions using one of your assigned warehouses as the source' }, { status: 403 });
      }

      const batch = adminDb.batch();

      batch.update(docRef, {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: FieldValue.serverTimestamp(),
        finalSourceWarehouseId: finalSourceWarehouseId,
        updatedAt: FieldValue.serverTimestamp()
      });

      const sourceWarehouseSnap = await adminDb.collection('warehouses').doc(finalSourceWarehouseId).get();
      if (!sourceWarehouseSnap.exists) {
        return NextResponse.json({ error: 'Source warehouse not found' }, { status: 404 });
      }
      
      const sourceWarehouse = sourceWarehouseSnap.data()!;
      const delSnapshot = await adminDb.collection('deliveries').where('warehouseId', '==', finalSourceWarehouseId).get();
      const deliveryCount = delSnapshot.size;
      const deliveryNumber = generateReferenceNumber('WH', sourceWarehouse.code, 'OUT', deliveryCount + 1);

      const deliveryLines = (requisition!.lines || []).map((line: any) => ({
        productId: line.productId,
        quantity: line.quantityRequested,
      }));

      const deliveryRef = adminDb.collection('deliveries').doc();
      batch.set(deliveryRef, {
        deliveryNumber,
        warehouseId: finalSourceWarehouseId,
        targetWarehouseId: requisition!.requestingWarehouseId,
        requisitionId: docSnap.id,
        status: 'WAITING',
        lines: deliveryLines,
        reference: `Requisition: ${requisition!.requisitionNumber}`,
        notes: `Auto-created from approved requisition ${requisition!.requisitionNumber}`,
        createdBy: userId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      await batch.commit();

    } else if (action === 'reject') {
      if (userRole !== 'MANAGER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (requisition!.status !== 'SUBMITTED') {
        return NextResponse.json({ error: 'Can only reject SUBMITTED requisitions' }, { status: 400 });
      }
      
      await docRef.update({
        status: 'REJECTED',
        rejectedReason: body.reason || 'Rejected by manager',
        updatedAt: FieldValue.serverTimestamp()
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updatedSnap = await docRef.get();
    return NextResponse.json({ _id: updatedSnap.id, id: updatedSnap.id, ...updatedSnap.data() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}