import { adminDb } from '../firebase/admin';

export async function logEvent(severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL', message: string, metadata: any = {}) {
  await adminDb.collection('auditLogs').add({
    type: 'INTELLIGENCE_EVENT',
    severity,
    message,
    metadata,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
}

export async function logRiskIntervention(shipmentId: string, riskScore: number, action: string) {
  return logEvent('INFO', `Risk Intervention: ${action}`, {
    shipmentId,
    riskScore,
    category: 'RISK_MITIGATION'
  });
}
