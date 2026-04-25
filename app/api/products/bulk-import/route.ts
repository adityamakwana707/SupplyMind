import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';
import { ProductImportData } from '@/lib/services/excelImportService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user?.role || 'UNKNOWN';
    if (!['ADMIN', 'MANAGER'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const products: ProductImportData[] = body.products;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: 'Products array is required and must not be empty' },
        { status: 400 }
      );
    }

    const results = {
      total: products.length,
      created: 0,
      updated: 0,
      errors: [] as Array<{ row: number; sku: string; error: string }>,
    };

    const productsRef = adminDb.collection('products');

    for (let i = 0; i < products.length; i++) {
      const productData = products[i];
      
      try {
        const snapshot = await productsRef.where('sku', '==', productData.sku).limit(1).get();
        
        if (!snapshot.empty) {
          const docId = snapshot.docs[0].id;
          await productsRef.doc(docId).update({
            name: productData.name,
            category: productData.category,
            unit: productData.unit,
            price: productData.price,
            reorderLevel: productData.reorderLevel,
            abcClass: productData.abcClass,
            updatedAt: new Date()
          });
          results.updated++;
        } else {
          await productsRef.add({
            name: productData.name,
            sku: productData.sku,
            category: productData.category,
            unit: productData.unit,
            price: productData.price,
            reorderLevel: productData.reorderLevel,
            abcClass: productData.abcClass,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          results.created++;
        }
      } catch (error: any) {
        console.error(`Error processing product ${productData.sku}:`, error);
        results.errors.push({
          row: i + 1,
          sku: productData.sku,
          error: error.message || 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. ${results.created} created, ${results.updated} updated`,
      results,
    });

  } catch (error) {
    console.error('Bulk product import error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
