import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';

const recomputeTransportReliability = async (partnerId: string): Promise<number> => {
  const acceptedJobsSnap = await adminDb.collection('gigJobs')
    .where('acceptedBy', '==', partnerId)
    .get();

  const acceptedJobs = acceptedJobsSnap.docs.map((doc) => doc.data() as any);
  if (!acceptedJobs.length) {
    await adminDb.collection('transportPartners').doc(partnerId).update({
      reliabilityScore: 80,
      updatedAt: new Date().toISOString()
    });
    return 80;
  }

  const completedCount = acceptedJobs.filter((job) => job.status === 'COMPLETED').length;
  const completionRate = completedCount / acceptedJobs.length;
  const reliabilityScore = Math.max(30, Math.min(100, Math.round(completionRate * 100)));

  await adminDb.collection('transportPartners').doc(partnerId).update({
    reliabilityScore,
    updatedAt: new Date().toISOString()
  });

  return reliabilityScore;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSessionFirebase();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'TRANSPORT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const partnerId = (session.user as any).partnerId;
    if (!partnerId) {
      return NextResponse.json({ error: 'Transport session missing partnerId.' }, { status: 400 });
    }

    const jobRef = adminDb.collection('gigJobs').doc(id);
    await adminDb.runTransaction(async (t) => {
      const jobDoc = await t.get(jobRef);
      if (!jobDoc.exists) {
        throw new Error('Gig job not found.');
      }
      const job = jobDoc.data() as any;

      if (job.status !== 'ACCEPTED') {
        throw new Error('Gig job must be ACCEPTED before completion.');
      }
      if (job.acceptedBy !== partnerId) {
        throw new Error('Only assigned partner can complete this gig job.');
      }

      t.update(jobRef, {
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const partnerRef = adminDb.collection('transportPartners').doc(partnerId);
      t.update(partnerRef, {
        status: 'AVAILABLE',
        updatedAt: new Date().toISOString()
      });
    });

    const newReliabilityScore = await recomputeTransportReliability(partnerId);
    return NextResponse.json({
      success: true,
      message: 'Gig job completed.',
      reliabilityScore: newReliabilityScore
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to complete gig job.' }, { status: 400 });
  }
}
