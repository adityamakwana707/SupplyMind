import { NextResponse } from 'next/server';
import { getApiCallStats } from '@/lib/rateLimit';

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(getApiCallStats(), { status: 200 });
}

