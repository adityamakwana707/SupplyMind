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
    const limit = Math.min(Number(searchParams.get('limit') || '100'), 200);

    let query: FirebaseFirestore.Query = adminDb.collection('decisionCards').orderBy('createdAt', 'desc');
    if (status) query = query.where('status', '==', status);

    const snap = await query.limit(limit).get();
    const cards = snap.docs.map((doc) => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        shipmentId: data.shipmentId || null,
        status: data.status || 'PENDING',
        riskScore: Number(data?.cascadePayload?.triggerRiskScore || 0),
        approvedOption: data.approvedOptionType ? { type: data.approvedOptionType } : null,
        options: Array.isArray(data.options) ? data.options : [],
        createdAt: data.createdAt || null,
        approvedAt: data.approvedAt || null,
        aiGenerated: data.aiGenerated ?? null,
        fallbackReason: data.fallbackReason ?? null
      };
    });

    return NextResponse.json(cards);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list decisions.' }, { status: 500 });
  }
}

