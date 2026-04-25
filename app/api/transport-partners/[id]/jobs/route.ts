import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: partnerId } = await params;
    const partnerDoc = await adminDb.collection('transportPartners').doc(partnerId).get();
    if (!partnerDoc.exists) {
      return NextResponse.json({ error: 'Transport partner not found.' }, { status: 404 });
    }

    const acceptedSnap = await adminDb.collection('gigJobs')
      .where('acceptedBy', '==', partnerId)
      .get();
    const offeredSnap = await adminDb.collection('gigJobs')
      .where('offeredTo', 'array-contains', partnerId)
      .get();

    const merged = new Map<string, any>();
    acceptedSnap.docs.forEach((doc) => merged.set(doc.id, { id: doc.id, ...doc.data() }));
    offeredSnap.docs.forEach((doc) => merged.set(doc.id, { id: doc.id, ...doc.data() }));

    const jobs = Array.from(merged.values()).sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    return NextResponse.json(jobs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch partner jobs.' }, { status: 500 });
  }
}
