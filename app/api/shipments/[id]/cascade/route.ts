import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';

const toTime = (value: any): number => {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  const date = new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMIN', 'MANAGER'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: shipmentId } = await params;
    const cardSnap = await adminDb
      .collection('decisionCards')
      .where('shipmentId', '==', shipmentId)
      .get();

    if (!cardSnap.empty) {
      const sortedDocs = cardSnap.docs.sort(
        (a, b) => toTime((b.data() as any)?.createdAt) - toTime((a.data() as any)?.createdAt)
      );
      const doc = sortedDocs[0];
      const data = doc.data() as any;
      return NextResponse.json({
        shipmentId,
        source: 'decisionCard',
        decisionId: doc.id,
        cascadeResult: data.cascadePayload || null,
        riskScore: Number(data?.cascadePayload?.triggerRiskScore || 0)
      });
    }

    const riskEventSnap = await adminDb
      .collection('riskEvents')
      .where('shipmentId', '==', shipmentId)
      .get();
    if (!riskEventSnap.empty) {
      const sortedDocs = riskEventSnap.docs.sort(
        (a, b) => toTime((b.data() as any)?.createdAt) - toTime((a.data() as any)?.createdAt)
      );
      const doc = sortedDocs[0];
      const data = doc.data() as any;
      return NextResponse.json({
        shipmentId,
        source: 'riskEvent',
        riskEventId: doc.id,
        cascadeResult: data.cascadeResult || null,
        riskScore: Number(data?.riskScore || 0)
      });
    }

    return NextResponse.json({ error: 'No cascade simulation found for this shipment.' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch cascade details.' }, { status: 500 });
  }
}

