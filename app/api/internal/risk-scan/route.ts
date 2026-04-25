import { NextRequest, NextResponse } from 'next/server';
import { runRiskScan } from '@/lib/services/riskEngine';

// POST route triggered by n8n orchestrator or cron
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-n8n-secret');
    const secret = process.env.N8N_ORCHESTRATION_SECRET;
    if (!secret || !authHeader || authHeader !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await runRiskScan();
    return NextResponse.json({ success: true, processed: results.length, data: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
