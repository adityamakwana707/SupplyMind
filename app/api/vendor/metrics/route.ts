import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';

const asDate = (value: any): Date | null => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'VENDOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const vendorId = (session.user as any).vendorId;
    if (!vendorId) return NextResponse.json({ error: 'Vendor context missing in session.' }, { status: 400 });

    const vendorDoc = await adminDb.collection('vendors').doc(vendorId).get();
    if (!vendorDoc.exists) return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 });
    const vendorData = vendorDoc.data() as any;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const receiptsSnap = await adminDb.collection('receipts')
      .where('vendorId', '==', vendorId)
      .get();

    const receipts = receiptsSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as any)
      .filter((receipt) => {
        const createdAt = asDate(receipt.createdAt);
        if (!createdAt) return true;
        return createdAt.getTime() >= ninetyDaysAgo.getTime();
      });
    const totalOrders = receipts.length;
    let onTimeCount = 0;
    let totalDelayDays = 0;
    let delaySamples = 0;

    receipts.forEach((receipt) => {
      const expectedDate = asDate(receipt.expectedDeliveryDate);
      const actualDate = asDate(receipt.actualDeliveryDate);
      if (expectedDate && actualDate) {
        if (actualDate.getTime() <= expectedDate.getTime()) {
          onTimeCount += 1;
        } else {
          const delayDays = (actualDate.getTime() - expectedDate.getTime()) / (1000 * 3600 * 24);
          totalDelayDays += delayDays;
          delaySamples += 1;
        }
      }
    });

    const lateCount = Math.max(0, totalOrders - onTimeCount);
    const avgDelayDays = delaySamples > 0 ? Number((totalDelayDays / delaySamples).toFixed(2)) : 0;

    return NextResponse.json({
      vendorId,
      vendorName: vendorData.name || vendorData.vendorName || session.user.name || 'Vendor',
      reliabilityScore: Number(vendorData.reliabilityScore || 0),
      totalOrders,
      onTimeCount,
      lateCount,
      avgDelayDays
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load vendor metrics.' }, { status: 500 });
  }
}
