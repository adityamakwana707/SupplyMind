import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const snap = await adminDb.collection('decisionCards')
       .where('status', '==', 'PENDING')
       .get();

    const currentCards = snap.docs.map(doc => ({
       id: doc.id,
       _id: doc.id,
       ...doc.data()
    }));

    return NextResponse.json(currentCards);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
