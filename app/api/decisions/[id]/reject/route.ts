import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMIN', 'MANAGER'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    const { id } = await params;
    const cardRef = adminDb.collection('decisionCards').doc(id);
    const cardSnap = await cardRef.get();
    if (!cardSnap.exists) return NextResponse.json({ error: 'Decision not found' }, { status: 404 });

    const data = cardSnap.data() as any;
    if (data.status !== 'PENDING') {
      return NextResponse.json({ error: 'Decision is already resolved.' }, { status: 400 });
    }

    await cardRef.update({
      status: 'REJECTED',
      rejectedBy: session.user.id,
      rejectedAt: new Date().toISOString(),
      rejectReason: reason || null,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to reject decision.' }, { status: 500 });
  }
}

