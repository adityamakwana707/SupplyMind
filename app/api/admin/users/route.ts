import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const role = searchParams.get('role');
    const warehouseId = searchParams.get('warehouseId');

    let query: any = adminDb.collection('users');

    if (status) query = query.where('status', '==', status);
    if (role) query = query.where('role', '==', role);
    if (warehouseId) query = query.where('assignedWarehouses', 'array-contains', warehouseId);

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    
    const users = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      _id: doc.id,
      ...doc.data()
    }));

    // Populate
    for (const user of users) {
      if (user.primaryWarehouseId) {
        const wh = await adminDb.collection('warehouses').doc(user.primaryWarehouseId).get();
        if (wh.exists) user.primaryWarehouseId = { id: wh.id, _id: wh.id, name: wh.data()?.name, code: wh.data()?.code };
      }
      
      if (user.assignedWarehouses && Array.isArray(user.assignedWarehouses)) {
        const whs = await Promise.all(
          user.assignedWarehouses.map(async (wid: string) => {
            const wDoc = await adminDb.collection('warehouses').doc(wid).get();
            return wDoc.exists ? { id: wDoc.id, _id: wDoc.id, name: wDoc.data()?.name, code: wDoc.data()?.code } : null;
          })
        );
        user.assignedWarehouses = whs.filter(Boolean);
      }
    }

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, password, role, status, assignedWarehouses, primaryWarehouseId } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (role && (role === 'OPERATOR' || role === 'MANAGER')) {
      if (!assignedWarehouses || assignedWarehouses.length !== 1) {
        return NextResponse.json(
          { error: 'Operators and Managers must be assigned to exactly one warehouse' },
          { status: 400 }
        );
      }
    }

    try {
      const userRecord = await adminAuth.createUser({
        email: email.toLowerCase(),
        password,
        displayName: name,
      });

      const userData = {
        name,
        email: email.toLowerCase(),
        role: role || null,
        status: status || 'ACTIVE',
        assignedWarehouses: assignedWarehouses || [],
        primaryWarehouseId: primaryWarehouseId || null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await adminDb.collection('users').doc(userRecord.uid).set(userData);

      const populatedUser: any = { id: userRecord.uid, _id: userRecord.uid, ...userData };

      if (populatedUser.primaryWarehouseId) {
        const wh = await adminDb.collection('warehouses').doc(populatedUser.primaryWarehouseId).get();
        if (wh.exists) populatedUser.primaryWarehouseId = { id: wh.id, _id: wh.id, name: wh.data()?.name, code: wh.data()?.code };
      }
    
      if (populatedUser.assignedWarehouses && Array.isArray(populatedUser.assignedWarehouses)) {
        const whs = await Promise.all(
          populatedUser.assignedWarehouses.map(async (wid: string) => {
            const wDoc = await adminDb.collection('warehouses').doc(wid).get();
            return wDoc.exists ? { id: wDoc.id, _id: wDoc.id, name: wDoc.data()?.name, code: wDoc.data()?.code } : null;
          })
        );
        populatedUser.assignedWarehouses = whs.filter(Boolean);
      }

      return NextResponse.json(populatedUser, { status: 201 });
      
    } catch (err: any) {
      if (err.code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
      }
      throw err;
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
