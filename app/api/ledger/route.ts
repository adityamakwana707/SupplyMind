import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb, admin } from '@/lib/firebase/admin';
import { getDocument } from '@/lib/firebase/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const warehouseId = searchParams.get('warehouseId');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query: admin.firestore.Query = adminDb.collection('stockMovements');

    // For Operators, filter by assigned warehouses
    const userRole = session.user?.role;
    const assignedWarehouses = session.user?.assignedWarehouses || [];
    
    if (productId) {
      query = query.where('productId', '==', productId);
    }

    if (type) {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    
    let allMovements: any[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: (doc.data() as any).createdAt?.toDate ? (doc.data() as any).createdAt.toDate() : (doc.data() as any).createdAt
    }));

    // Post-query filtering for complex logical conditions:
    if (userRole === 'OPERATOR' && assignedWarehouses.length > 0) {
      allMovements = allMovements.filter(m => 
        assignedWarehouses.includes(m.warehouseFromId) || 
        assignedWarehouses.includes(m.warehouseToId)
      );
    } else if (warehouseId) {
      allMovements = allMovements.filter(m => 
        m.warehouseFromId === warehouseId || 
        m.warehouseToId === warehouseId
      );
    }

    if (startDate) {
      const sDate = new Date(startDate).getTime();
      allMovements = allMovements.filter(m => m.createdAt && m.createdAt.getTime() >= sDate);
    }
    if (endDate) {
      const eDate = new Date(endDate).getTime();
      allMovements = allMovements.filter(m => m.createdAt && m.createdAt.getTime() <= eDate);
    }

    const total = allMovements.length;
    
    // Pagination
    const paginatedMovements = allMovements.slice((page - 1) * limit, page * limit);

    // Populate references
    const populated = await Promise.all(
      paginatedMovements.map(async (m: any) => {
        const [product, wFrom, wTo, lFrom, lTo, createdBy] = await Promise.all([
          m.productId ? getDocument<any>('products', m.productId) : null,
          m.warehouseFromId ? getDocument<any>('warehouses', m.warehouseFromId) : null,
          m.warehouseToId ? getDocument<any>('warehouses', m.warehouseToId) : null,
          m.locationFromId ? getDocument<any>('locations', m.locationFromId) : null,
          m.locationToId ? getDocument<any>('locations', m.locationToId) : null,
          m.createdBy ? getDocument<any>('users', m.createdBy) : null,
        ]);
        return {
          ...m,
          productId: product || { id: m.productId },
          warehouseFromId: wFrom || { id: m.warehouseFromId },
          warehouseToId: wTo || { id: m.warehouseToId },
          locationFromId: lFrom || { id: m.locationFromId },
          locationToId: lTo || { id: m.locationToId },
          createdBy: createdBy || { id: m.createdBy },
        };
      })
    );

    return NextResponse.json({
      movements: populated,
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
