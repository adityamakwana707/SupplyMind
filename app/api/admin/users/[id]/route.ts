import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSessionFirebase();
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const doc = await adminDb.collection('users').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user: any = { id: doc.id, _id: doc.id, ...doc.data() };

    // Populate assignedWarehouses & primaryWarehouseId
    if (user.primaryWarehouseId) {
      const wh = await adminDb.collection('warehouses').doc(user.primaryWarehouseId).get();
      if (wh.exists) user.primaryWarehouseId = { id: wh.id, _id: wh.id, name: wh.data()?.name, code: wh.data()?.code };
    }

    if (user.assignedWarehouses && Array.isArray(user.assignedWarehouses)) {
      const whs = await Promise.all(
        user.assignedWarehouses.map(async (wid: string) => {
          const w = await adminDb.collection('warehouses').doc(wid).get();
          return w.exists ? { id: w.id, _id: w.id, name: w.data()?.name, code: w.data()?.code } : null;
        })
      );
      user.assignedWarehouses = whs.filter(Boolean);
    }

    return NextResponse.json(user);
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
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      email,
      role,
      status,
      assignedWarehouses,
      primaryWarehouseId,
      password,
      confirmManager
    } = body;

    const updateData: any = { updatedAt: new Date() };

    // Validate warehouse assignment for operators and managers
    if (role && (role === 'OPERATOR' || role === 'MANAGER') && assignedWarehouses !== undefined) {
      if (!assignedWarehouses || assignedWarehouses.length !== 1) {
        return NextResponse.json(
          { error: 'Operators and Managers must be assigned to exactly one warehouse' },
          { status: 400 }
        );
      }
    }

    const userRef = adminDb.collection('users').doc(id);
    const existingDoc = await userRef.get();
    
    if (!existingDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const existingUser = existingDoc.data();

    // If changing role to MANAGER, require confirmation
    if (role === 'MANAGER' && existingUser?.role !== 'MANAGER') {
      if (!confirmManager) {
        return NextResponse.json(
          { error: 'Changing role to MANAGER requires confirmation. Please set confirmManager: true in the request body.' },
          { status: 400 }
        );
      }
    }

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (assignedWarehouses !== undefined) updateData.assignedWarehouses = assignedWarehouses;
    if (primaryWarehouseId !== undefined) updateData.primaryWarehouseId = primaryWarehouseId ? primaryWarehouseId : null;

    if (password) {
      await adminAuth.updateUser(id, { password });
    }
    if (email !== undefined || name !== undefined) {
      const authUpdates: any = {};
      if (email !== undefined) authUpdates.email = email;
      if (name !== undefined) authUpdates.displayName = name;
      try { await adminAuth.updateUser(id, authUpdates); } catch(err) {}
    }

    await userRef.update(updateData);
    
    return NextResponse.json({ id, ...existingUser, ...updateData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSessionFirebase();
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await adminDb.collection('users').doc(id).update({
      status: 'INACTIVE',
      isActive: false,
      updatedAt: new Date()
    });

    try {
      await adminAuth.updateUser(id, { disabled: true });
    } catch(err) {
      console.error(err);
    }

    return NextResponse.json({ message: 'User deactivated' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
