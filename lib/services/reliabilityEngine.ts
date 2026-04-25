import { adminDb } from '../firebase/admin';

export const recomputeVendorReliability = async () => {
  const receiptsSnap = await adminDb.collection('receipts').get();
  const vendorStats: Record<
    string,
    { vendorName: string; count: number; onTimeCount: number; qualityAcceptedCount: number; delayDays: number[] }
  > = {};

  const toDate = (v: any): Date | null => {
    if (!v) return null;
    if (typeof v?.toDate === 'function') return v.toDate();
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  receiptsSnap.docs.forEach((doc) => {
    const data = doc.data() as any;
    const vendorId = String(data.vendorId || '').trim();
    if (!vendorId) return;

    if (!vendorStats[vendorId]) {
      vendorStats[vendorId] = {
        vendorName: data.vendorName || data.supplierName || vendorId,
        count: 0,
        onTimeCount: 0,
        qualityAcceptedCount: 0,
        delayDays: []
      };
    }
    const stats = vendorStats[vendorId];
    stats.count += 1;

    const expectedDate = toDate(data.expectedDeliveryDate) || toDate(data.requiredBy);
    const actualDate = toDate(data.actualDeliveryDate) || toDate(data.receivedAt) || toDate(data.updatedAt);
    if (expectedDate && actualDate) {
      const delay = (actualDate.getTime() - expectedDate.getTime()) / (1000 * 3600 * 24);
      stats.delayDays.push(Math.max(0, delay));
      if (delay <= 0) stats.onTimeCount += 1;
    }

    const qualityAccepted = data.qualityAccepted === true || String(data.qualityStatus || '').toUpperCase() === 'ACCEPTED';
    if (qualityAccepted) stats.qualityAcceptedCount += 1;
  });

  const results: Array<{ vendorId: string; vendor: string; score: number }> = [];

  for (const [vendorId, stats] of Object.entries(vendorStats)) {
    const onTimeRate = stats.count > 0 ? stats.onTimeCount / stats.count : 0;
    const qualityRate = stats.count > 0 ? stats.qualityAcceptedCount / stats.count : 0;

    // SPEC: consistencyScore = 1 - (stdDev / mean), clamped 0-1
    let consistencyScore = 1.0;
    if (stats.delayDays.length > 1) {
      const mean = stats.delayDays.reduce((sum, d) => sum + d, 0) / stats.delayDays.length;
      const variance = stats.delayDays.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / stats.delayDays.length;
      const stdDev = Math.sqrt(variance);
      consistencyScore = mean > 0 ? Math.max(0, Math.min(1, 1 - (stdDev / mean))) : 1.0;
    } else if (stats.delayDays.length === 1) {
      // Single sample: no spread, but check if it was late
      consistencyScore = stats.delayDays[0] === 0 ? 1.0 : 0.5;
    }


    let score = Math.round((onTimeRate * 100) * 0.5 + (qualityRate * 100) * 0.3 + (consistencyScore * 100) * 0.2);
    score = Math.max(0, Math.min(100, score));

    await adminDb.collection('vendorMetrics').doc(vendorId).set({
      vendorId,
      vendorName: stats.vendorName,
      reliabilityScore: score,
      totalReceipts: stats.count,
      onTimeRate: Number((onTimeRate * 100).toFixed(2)),
      qualityRate: Number((qualityRate * 100).toFixed(2)),
      consistencyScore: Number((consistencyScore * 100).toFixed(2)),
      updatedAt: new Date().toISOString()
    });

    await adminDb.collection('vendors').doc(vendorId).set(
      {
        reliabilityScore: score,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    const shipmentsSnap = await adminDb
      .collection('shipments')
      .where('vendorId', '==', vendorId)
      .where('status', 'in', ['IN_TRANSIT', 'DISPATCHED'])
      .get();

    for (const shDoc of shipmentsSnap.docs) {
      await shDoc.ref.update({ vendorReliabilityScore: score, updatedAt: new Date().toISOString() });
    }

    results.push({ vendorId, vendor: stats.vendorName, score });
  }

  return results;
};
