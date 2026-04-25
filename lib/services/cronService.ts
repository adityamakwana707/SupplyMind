import cron from 'node-cron';
import { runRiskScan } from './riskEngine';
import { recomputeVendorReliability } from './reliabilityEngine';
import { adminDb } from '../firebase/admin';

let isCronStarted = false;

export const initCron = () => {
    if (isCronStarted) return;

    cron.schedule('*/15 * * * *', async () => {
        try {
            const results = await runRiskScan();
            
            // Log audit trail
            await adminDb.collection('auditLogs').add({
                type: 'AUTOMATED_SCAN',
                timestamp: new Date().toISOString(),
                results: results || [],
                status: 'SUCCESS'
            });
        } catch (err: any) {
            await adminDb.collection('auditLogs').add({
                type: 'AUTOMATED_SCAN_FAILURE',
                timestamp: new Date().toISOString(),
                error: err.message,
                status: 'FAILURE'
            });
        }
    });

    cron.schedule('0 0 * * *', async () => {
        try {
            const results = await recomputeVendorReliability();
            await adminDb.collection('auditLogs').add({
                type: 'VENDOR_RELIABILITY_RECOMPUTE',
                timestamp: new Date().toISOString(),
                results: results || [],
                status: 'SUCCESS'
            });
        } catch (err: any) {
            await adminDb.collection('auditLogs').add({
                type: 'VENDOR_RELIABILITY_RECOMPUTE_FAILURE',
                timestamp: new Date().toISOString(),
                error: err.message,
                status: 'FAILURE'
            });
        }
    });

    isCronStarted = true;
};
