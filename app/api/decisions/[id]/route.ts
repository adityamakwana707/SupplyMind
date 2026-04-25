import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMIN', 'MANAGER'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const snap = await adminDb.collection('decisionCards').doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: 'Decision not found' }, { status: 404 });

    return NextResponse.json({
      id: snap.id,
      ...snap.data()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch decision.' }, { status: 500 });
  }
}

