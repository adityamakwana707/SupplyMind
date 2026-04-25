import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMIN', 'MANAGER'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const shipmentId = searchParams.get('shipmentId');
    const limit = Math.min(Number(searchParams.get('limit') || '100'), 200);

    let query: FirebaseFirestore.Query = adminDb.collection('riskEvents').orderBy('createdAt', 'desc');
    if (status) query = query.where('status', '==', status);
    if (shipmentId) query = query.where('shipmentId', '==', shipmentId);

    const snap = await query.limit(limit).get();
    const rows = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list risk events.' }, { status: 500 });
  }
}

