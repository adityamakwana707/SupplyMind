import { NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';

export async function GET() {
  try {
    const session = await getServerSessionFirebase();

    if (!session) {
      return NextResponse.json({ user: null, authenticated: false }, { status: 200 });
    }

    return NextResponse.json(session, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
