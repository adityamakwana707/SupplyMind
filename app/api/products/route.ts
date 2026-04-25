import { NextRequest, NextResponse } from 'next/server';
import { getCollection, addDocument } from '@/lib/firebase/db';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const abcClass = searchParams.get('abcClass');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let productsRef: any = adminDb.collection('products').where('isActive', '==', true);
    
    if (category) {
      productsRef = productsRef.where('category', '==', category);
    }
    
    if (abcClass) {
      productsRef = productsRef.where('abcClass', '==', abcClass);
    }

    // Since Firebase doesn't support generic text search and pagination like mongo easily,
    // we'll fetch products and do filtering/pagination in memory for now.
    const snapshot = await productsRef.get();
    let products = snapshot.docs.map((doc: any) => ({
      ...doc.data(),
      id: doc.id,
      _id: doc.id,
    }));

    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter((p: any) => 
        (p.name?.toLowerCase().includes(searchLower)) || 
        (p.sku?.toLowerCase().includes(searchLower))
      );
    }

    const total = products.length;

    // Apply sorting and pagination in memory
    products = products
      .sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      .slice((page - 1) * limit, page * limit);

    // Get warehouse filter for Operators and URL parameters
    const warehouseId = searchParams.get('warehouseId');
    const userRole = session.user?.role;
    const assignedWarehouses = session.user?.assignedWarehouses || [];
    
    let warehouseFilter: string[] | null = null;
    if (userRole === 'OPERATOR' && assignedWarehouses.length > 0) {
      warehouseFilter = warehouseId && assignedWarehouses.includes(warehouseId) 
        ? [warehouseId]
        : assignedWarehouses;
    } else if (warehouseId && warehouseId !== 'all') {
      warehouseFilter = [warehouseId];
    }

    // Get total quantities for each product
    const productsWithQuantities = await Promise.all(
      products.map(async (product: any) => {
        let stockQuery: any = adminDb.collection('stockLevels').where('productId', '==', product.id);
        if (warehouseFilter && warehouseFilter.length > 0) {
          stockQuery = stockQuery.where('warehouseId', 'in', warehouseFilter);
        }
        const stockLevelsDoc = await stockQuery.get();
        const stockQuantity = stockLevelsDoc.docs.reduce((sum: number, sl: any) => sum + (sl.data().quantity || 0), 0);
        const parsedFallbackQuantity = Number(product.quantity);
        const fallbackQuantity = Number.isFinite(parsedFallbackQuantity) ? parsedFallbackQuantity : 0;
        const totalQuantity = stockLevelsDoc.empty ? fallbackQuantity : stockQuantity;
        return {
          ...product,
          totalQuantity,
        };
      })
    );

    return NextResponse.json({
      products: productsWithQuantities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session || !['ADMIN', 'MANAGER'].includes(session.user?.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, sku, category, unit, price, reorderLevel, abcClass, description, isActive } = body;

    if (!name || !sku || !unit || reorderLevel === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for duplicate SKU first
    const existingSku = await adminDb.collection('products').where('sku', '==', sku).limit(1).get();
    if (!existingSku.empty) {
      return NextResponse.json({ error: 'SKU already exists' }, { status: 400 });
    }

    const product = await addDocument('products', {
      name,
      sku,
      category,
      unit,
      price,
      reorderLevel,
      abcClass,
      description,
      isActive: isActive !== undefined ? isActive : true,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

