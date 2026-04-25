import { NextRequest, NextResponse } from 'next/server';
import { runRiskScan } from '@/lib/services/riskEngine';

export async function POST(request: NextRequest) {
  try {
    // Robust Webhook Authentication for n8n
    const authHeader = request.headers.get('x-n8n-secret');
    const secret = process.env.N8N_ORCHESTRATION_SECRET;

    if (!authHeader || authHeader !== secret) {
      return NextResponse.json({ error: 'Orchestration Unauthorized' }, { status: 401 });
    }

    // Trigger the Network-wide Risk Scan
    const results = await runRiskScan();

    return NextResponse.json({ 
       success: true, 
       timestamp: new Date().toISOString(),
       scannedNodes: results.length 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
