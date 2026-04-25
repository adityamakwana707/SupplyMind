import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { recomputeVendorReliability } from '@/lib/services/reliabilityEngine';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await recomputeVendorReliability();

    return NextResponse.json({ 
      success: true, 
      message: 'Vendor reliability scores recomputed across the network.',
      details: results 
    });
  } catch (error: any) {
    console.error('Reliability recompute error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
