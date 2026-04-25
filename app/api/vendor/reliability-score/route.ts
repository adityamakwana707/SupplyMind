import { NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';

export async function GET() {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'VENDOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const vendorId = (session.user as any).vendorId;
    if (!vendorId) return NextResponse.json({ error: 'Vendor context missing in session.' }, { status: 400 });

    const [vendorSnap, metricsSnap] = await Promise.all([
      adminDb.collection('vendors').doc(vendorId).get(),
      adminDb.collection('vendorMetrics').doc(vendorId).get()
    ]);

    if (!vendorSnap.exists) return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 });

    const vendor = vendorSnap.data() as any;
    const metrics = metricsSnap.exists ? (metricsSnap.data() as any) : {};

    return NextResponse.json({
      vendorId,
      vendorName: vendor.name || vendor.vendorName || session.user.name || 'Vendor',
      reliabilityScore: Number(vendor.reliabilityScore || metrics.reliabilityScore || 0),
      onTimeDeliveryRate: Number(metrics.onTimeRate || 0),
      qualityAcceptanceRate: Number(metrics.qualityRate || 0),
      consistencyScore: Number(metrics.consistencyScore || 0),
      lastComputedAt: metrics.updatedAt || null
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch reliability score.' }, { status: 500 });
  }
}

