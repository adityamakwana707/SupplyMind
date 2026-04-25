import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { getDocument, updateDocument } from '@/lib/firebase/db';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const receipt = await getDocument<any>('receipts', id);
    if (!receipt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });

    // Populate relations
    let warehouse = null;
    let createdBy = null;

    if (receipt.warehouseId) {
      try {
        const whDoc = await adminDb.collection('warehouses').doc(receipt.warehouseId).get();
        if (whDoc.exists) {
          const whData = whDoc.data();
          warehouse = { _id: whDoc.id, id: whDoc.id, name: whData?.name, code: whData?.code };
        }
      } catch(e) {}
    }

    if (receipt.createdBy) {
      try {
        const userDoc = await adminDb.collection('users').doc(receipt.createdBy).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          createdBy = { _id: userDoc.id, id: userDoc.id, name: userData?.name, email: userData?.email };
        }
      } catch(e) {}
    }

    const populatedLines = await Promise.all((receipt.lines || []).map(async (line: any) => {
      let product = null;
      let location = null;
      if (line.productId) {
        try {
          const pDoc = await adminDb.collection('products').doc(line.productId).get();
          if (pDoc.exists) {
            const pData = pDoc.data();
            product = { _id: pDoc.id, id: pDoc.id, name: pData?.name, sku: pData?.sku };
          }
        } catch(e){}
      }
      if (line.locationId) {
        try {
          const lDoc = await adminDb.collection('locations').doc(line.locationId).get();
          if (lDoc.exists) {
            const lData = lDoc.data();
            location = { _id: lDoc.id, id: lDoc.id, name: lData?.name, code: lData?.code };
          }
        } catch(e){}
      }
      return {
        ...line,
        productId: product || line.productId,
        locationId: location || line.locationId
      };
    }));

    const populatedReceipt = {
      ...receipt,
      warehouseId: warehouse || receipt.warehouseId,
      createdBy: createdBy || receipt.createdBy,
      lines: populatedLines
    };

    return NextResponse.json(populatedReceipt);
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
    const receipt = await getDocument<any>('receipts', id);
    if (!receipt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });

    if (receipt.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Cannot update receipt that is not in DRAFT status' }, { status: 400 });
    }

    const body = await request.json();
    const updateData = { ...body, updatedAt: new Date().toISOString() };
    await updateDocument('receipts', id, updateData);

    const updated = await getDocument<any>('receipts', id);
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

    const userRole = session.user?.role;
    if (!['ADMIN', 'OPERATOR'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const receipt = await getDocument<any>('receipts', id);
    if (!receipt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });

    if (receipt.status === 'DONE') {
      return NextResponse.json({ error: 'Receipt already validated' }, { status: 400 });
    }

    const stockService = await import('@/lib/services/stockService');

    await adminDb.runTransaction(async (t) => {
      const docSnap = await t.get(adminDb.collection('receipts').doc(id));
      if (!docSnap.exists) throw new Error("Receipt not found");
      if (docSnap.data()?.status === 'DONE') throw new Error("Receipt already validated");

      for (const line of receipt.lines) {
        await stockService.updateStock(
          line.productId?.toString(),
          receipt.warehouseId?.toString(),
          line.locationId?.toString() || undefined,
          line.quantity,
          t
        );

        const movementRef = adminDb.collection('stockMovements').doc();
        t.set(movementRef, {
          type: 'RECEIPT',
          reason: 'RECEIPT',
          productId: line.productId,
          warehouseFromId: null,
          warehouseToId: receipt.warehouseId,
          locationFromId: null,
          locationToId: line.locationId || null,
          quantity: line.quantity,
          referenceId: id,
          createdBy: session.user?.id || null,
          createdAt: new Date()
        });
      }

      t.update(adminDb.collection('receipts').doc(id), {
        status: 'DONE',
        validatedBy: session.user?.id || null,
        validatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
    
    const updated = await getDocument<any>('receipts', id);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
