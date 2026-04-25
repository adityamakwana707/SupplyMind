import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const snapshot = await adminDb.collection('auditLogs')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(logs);
  } catch (error: any) {
    if (error.message.includes('requires an index')) {
       // Fallback to in-memory sort if index is still provisioning
       const snapshot = await adminDb.collection('auditLogs').get();
       const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
       logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
       return NextResponse.json(logs.slice(0, 50));
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
