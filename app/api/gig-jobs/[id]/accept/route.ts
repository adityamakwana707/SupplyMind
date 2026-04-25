import { NextRequest, NextResponse } from 'next/server';
import { adminDb, admin } from '@/lib/firebase/admin';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';

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
      if (job.status !== 'OPEN') {
        throw new Error('Gig job is not open.');
      }

      const expiresAt = new Date(job.offerExpiresAt);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
        throw new Error('Gig job offer has expired.');
      }

      const offeredTo = Array.isArray(job.offeredTo) ? job.offeredTo : [];
      if (!offeredTo.includes(partnerId)) {
        throw new Error('Partner is not eligible for this gig job.');
      }

      t.update(jobRef, {
        status: 'ACCEPTED',
        acceptedBy: partnerId,
        acceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      if (job.shipmentId) {
        const shipmentRef = adminDb.collection('shipments').doc(job.shipmentId);
        t.update(shipmentRef, {
          transportPartnerId: partnerId,
          updatedAt: new Date().toISOString()
        });
      }

      const acceptedPartnerRef = adminDb.collection('transportPartners').doc(partnerId);
      t.update(acceptedPartnerRef, {
        status: 'ON_JOB',
        updatedAt: new Date().toISOString()
      });

      offeredTo
        .filter((id: string) => id !== partnerId)
        .forEach((otherPartnerId: string) => {
          const otherPartnerRef = adminDb.collection('transportPartners').doc(otherPartnerId);
          t.update(otherPartnerRef, {
            cancelledJobs: admin.firestore.FieldValue.arrayUnion({
              gigJobId: id,
              cancelledAt: new Date().toISOString()
            }),
            updatedAt: new Date().toISOString()
          });
        });
    });

    return NextResponse.json({ success: true, message: 'Gig job accepted.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to accept gig job.' }, { status: 400 });
  }
}
