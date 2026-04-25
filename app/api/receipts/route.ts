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

    let receiptsRef: any = adminDb.collection('receipts');

    // For Operators, filter by assigned warehouses
    const userRole = session.user?.role;
    const assignedWarehouses = session.user?.assignedWarehouses || [];
    
    if (userRole === 'OPERATOR' && assignedWarehouses.length > 0) {
      receiptsRef = receiptsRef.where('warehouseId', 'in', assignedWarehouses);
    } else if (warehouseId) {
      receiptsRef = receiptsRef.where('warehouseId', '==', warehouseId);
    }

    if (status) {
      receiptsRef = receiptsRef.where('status', '==', status);
    }

    const snapshot = await receiptsRef.limit(100).get();
    let receipts = snapshot.docs.map((doc: any) => ({
      _id: doc.id,
      id: doc.id,
      ...doc.data(),
    }));

    if (search) {
      const searchLower = search.toLowerCase();
      receipts = receipts.filter((r: any) => 
        (r.receiptNumber?.toLowerCase().includes(searchLower)) || 
        (r.supplierName?.toLowerCase().includes(searchLower)) ||
        (r.reference?.toLowerCase().includes(searchLower))
      );
    }

    // Sort by createdAt descending
    receipts.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

    // Client-side populate equivalents for warehouseId, createdBy, lines.productId, lines.locationId
    // In a real optimized scenario, this might need more robust handling instead of generic map
    // but preserving original functionality pattern as much as possible.
    const populatedReceipts = await Promise.all(
      receipts.map(async (receipt: any) => {
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

        return {
          ...receipt,
          warehouseId: warehouse || receipt.warehouseId,
          createdBy: createdBy || receipt.createdBy,
          lines: populatedLines
        };
      })
    );

    return NextResponse.json(populatedReceipts);
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
    if (!['ADMIN', 'OPERATOR'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { supplierName, warehouseId, reference, notes, lines, status } = body;

    if (!warehouseId || !lines || lines.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // For Operators, verify they have access to this warehouse
    const assignedWarehouses = session.user?.assignedWarehouses || [];
    if (userRole === 'OPERATOR' && !assignedWarehouses.includes(warehouseId)) {
      return NextResponse.json(
        { error: 'You do not have access to this warehouse' },
        { status: 403 }
      );
    }

    const warehouseDoc = await getDocument<any>('warehouses', warehouseId);
    if (!warehouseDoc) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    // Generate receipt number by using a timestamp sequence
    const sequenceId = Date.now() % 1000000;
    const receiptNumber = generateReferenceNumber('WH', warehouseDoc.code, 'IN', sequenceId);

    const receipt = await addDocument('receipts', {
      receiptNumber,
      supplierName,
      warehouseId,
      reference,
      notes,
      lines: lines.map((line: any) => ({
        productId: line.productId,
        locationId: line.locationId || null,
        quantity: line.quantity,
      })),
      status: status || 'DRAFT',
      createdBy: session.user.id,
    });

    return NextResponse.json(receipt, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

