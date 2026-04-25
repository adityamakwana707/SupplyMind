import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { runRiskScan } from '@/lib/services/riskEngine';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSessionFirebase();
    const userRole = (session?.user as any)?.role;

    // SPEC: MANAGER or ADMIN can log customs events
    if (!session || !['ADMIN', 'MANAGER'].includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shipmentId = id;
    const body = await request.json();

    // SPEC: Body must use eventType / portCode / estimatedDelayHours / notes
    const { eventType, portCode, estimatedDelayHours, notes } = body;

    if (!['HOLD', 'INSPECTION', 'CLEARED'].includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid eventType. Must be HOLD, INSPECTION, or CLEARED.' },
        { status: 400 }
      );
    }

    const shipmentRef = adminDb.collection('shipments').doc(shipmentId);
    const shipmentDoc = await shipmentRef.get();
    if (!shipmentDoc.exists) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();

    // SPEC: Write to dedicated customsEvents collection
    await adminDb.collection('customsEvents').add({
      shipmentId,
      eventType,
      portCode: portCode || null,
      estimatedDelayHours: Number(estimatedDelayHours) || 0,
      notes: notes || null,
      loggedBy: session.user.id,
      loggedAt: nowIso,
      clearedAt: eventType === 'CLEARED' ? nowIso : null,
      createdAt: nowIso
    });

    if (eventType === 'HOLD' || eventType === 'INSPECTION') {
      // SPEC: Immediately set customsHoldProbability = 0.85 (flat), do NOT wait for cron
      await shipmentRef.update({
        customsHoldProbability: 0.85,
        customsStatus: eventType,
        lastCustomsEventAt: nowIso,
        updatedAt: nowIso
      });

      // SPEC: Directly trigger risk scan (bypasses cron timing)
      await runRiskScan();
    } else if (eventType === 'CLEARED') {
      // SPEC: Reset probability, mark cleared
      await shipmentRef.update({
        customsHoldProbability: 0,
        customsStatus: 'CLEARED',
        lastCustomsEventAt: nowIso,
        updatedAt: nowIso
      });

      // SPEC: Mark any open decision card as EXPIRED
      const openCards = await adminDb.collection('decisionCards')
        .where('shipmentId', '==', shipmentId)
        .where('status', '==', 'PENDING')
        .get();

      const batch = adminDb.batch();
      openCards.docs.forEach((doc) => {
        batch.update(doc.ref, { status: 'EXPIRED', updatedAt: nowIso });
      });
      await batch.commit();

      // Trigger risk scan to recompute (score should drop)
      await runRiskScan();
    }

    return NextResponse.json({
      success: true,
      message: `Customs event logged: ${eventType}${portCode ? ` at ${portCode}` : ''}`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
