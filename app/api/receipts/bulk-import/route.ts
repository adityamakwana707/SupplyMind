import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';
import { stockService } from '@/lib/services/stockService';
import { ReceiptImportData } from '@/lib/services/excelImportService';

interface GroupedReceiptData {
  supplierName: string;
  warehouseId: string;
  reference?: string;
  lines: Array<{
    productId: string;
    locationId?: string;
    quantity: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { receipts }: { receipts: ReceiptImportData[] } = await request.json();

    if (!receipts || !Array.isArray(receipts) || receipts.length === 0) {
      return NextResponse.json(
        { error: 'Receipts array is required and must not be empty' },
        { status: 400 }
      );
    }

    const results = {
      total: receipts.length,
      receiptsCreated: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    const validatedReceipts: Array<{
      original: ReceiptImportData;
      productId: string;
      warehouseId: string;
      locationId?: string;
      index: number;
    }> = [];

    const getDocsByFieldIC = async (collection: string, field: string, value: string) => {
      const snap = await adminDb.collection(collection).get();
      return snap.docs.find(d => {
        const data = d.data();
        return data.isActive !== false && typeof data[field] === 'string' && data[field].toLowerCase() === value.toLowerCase();
      });
    };

    for (let i = 0; i < receipts.length; i++) {
      const receiptData = receipts[i];
      
      try {
        const prodSnap = await adminDb.collection('products').where('sku', '==', receiptData.productSku).where('isActive', '==', true).limit(1).get();
        if (prodSnap.empty) {
          results.errors.push({ row: i + 1, error: `Product with SKU '${receiptData.productSku}' not found` });
          continue;
        }
        const product = prodSnap.docs[0];

        const warehouse = await getDocsByFieldIC('warehouses', 'name', receiptData.warehouseName);
        if (!warehouse) {
          results.errors.push({ row: i + 1, error: `Warehouse '${receiptData.warehouseName}' not found` });
          continue;
        }

        let locationId: string | undefined;
        if (receiptData.locationName) {
           const snapLocs = await adminDb.collection('locations').where('warehouseId', '==', warehouse.id).get();
           const location = snapLocs.docs.find(d => {
              const data = d.data();
              return data.isActive !== false && typeof data.name === 'string' && data.name.toLowerCase() === receiptData.locationName!.toLowerCase();
           });
           
          if (!location) {
            results.errors.push({ row: i + 1, error: `Location '${receiptData.locationName}' not found in warehouse '${receiptData.warehouseName}'` });
            continue;
          }
          locationId = location.id;
        }

        validatedReceipts.push({ original: receiptData, productId: product.id, warehouseId: warehouse.id, locationId, index: i });
      } catch (error: any) {
        results.errors.push({ row: i + 1, error: error.message || 'Validation error' });
      }
    }

    const groupedReceipts = new Map<string, GroupedReceiptData>();

    for (const validated of validatedReceipts) {
      const key = `${validated.original.supplierName}|${validated.warehouseId}|${validated.original.reference || ''}`;
      
      if (!groupedReceipts.has(key)) {
        groupedReceipts.set(key, {
          supplierName: validated.original.supplierName,
          warehouseId: validated.warehouseId,
          reference: validated.original.reference,
          lines: [],
        });
      }

      groupedReceipts.get(key)!.lines.push({
        productId: validated.productId,
        locationId: validated.locationId,
        quantity: validated.original.quantity,
      });
    }

    const receiptsRef = adminDb.collection('receipts');
    for (const [, receiptGroup] of groupedReceipts) {
      try {
        const statSnap = await adminDb.collection('counters').doc('receipts').get();
        let receiptCount = statSnap.exists ? (statSnap.data()?.count || 0) : 0;
        await adminDb.collection('counters').doc('receipts').set({ count: receiptCount + 1 }, { merge: true });

        const receiptNumber = `REC${String(receiptCount + 1).padStart(6, '0')}`;

        const receiptData = {
          receiptNumber,
          supplierName: receiptGroup.supplierName,
          warehouseId: receiptGroup.warehouseId,
          reference: receiptGroup.reference || null,
          status: 'DONE',
          lines: receiptGroup.lines,
          createdBy: session.user.id,
          validatedBy: session.user.id,
          validatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const docRef = await receiptsRef.add(receiptData);

        for (const line of receiptGroup.lines) {
          await stockService.updateStock(
            line.productId,
            receiptGroup.warehouseId,
            line.locationId || undefined,
            line.quantity
          );

          // Log movement
          await adminDb.collection('stockMovements').add({
            type: 'RECEIPT',
            reason: 'BULK_IMPORT',
            productId: line.productId,
            warehouseFromId: null,
            warehouseToId: receiptGroup.warehouseId,
            locationFromId: null,
            locationToId: line.locationId || null,
            quantity: line.quantity,
            referenceId: docRef.id,
            createdBy: session.user.id,
            createdAt: new Date()
          });
        }

        results.receiptsCreated++;
      } catch (error: any) {
        console.error('Error creating receipt:', error);
        results.errors.push({ row: 0, error: `Failed to create receipt for ${receiptGroup.supplierName}: ${error.message || 'Unknown error'}` });
      }
    }

    return NextResponse.json({ success: true, message: `Import completed. ${results.receiptsCreated} receipts created from ${validatedReceipts.length} valid entries`, results });

  } catch (error) {
    console.error('Bulk receipt import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
