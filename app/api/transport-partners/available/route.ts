import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';
import { haversineKm } from '@/lib/utils/geo';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const businessId = (session.user as any)?.businessId;
    if (!businessId) return NextResponse.json({ error: 'Missing businessId in session.' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const vehicleType = searchParams.get('vehicleType');
    const lat = Number(searchParams.get('lat'));
    const lng = Number(searchParams.get('lng'));
    const radiusKm = Number(searchParams.get('radius') || '80');

    const tiedSnap = await adminDb.collection('transportPartners')
      .where('partnerType', '==', 'TIED')
      .where('businessId', '==', businessId)
      .where('status', '==', 'AVAILABLE')
      .get();
    const gigSnap = await adminDb.collection('transportPartners')
      .where('partnerType', '==', 'GIG')
      .where('businessId', '==', null)
      .where('status', '==', 'AVAILABLE')
      .get();

    let partners = [...tiedSnap.docs, ...gigSnap.docs].map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
    if (vehicleType) {
      partners = partners.filter((p) => Array.isArray(p.vehicleTypes) && p.vehicleTypes.includes(vehicleType));
    }
    if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radiusKm) && radiusKm > 0) {
      partners = partners.filter((p) => {
        const pLat = Number(p.currentLat);
        const pLng = Number(p.currentLng);
        if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) return false;
        return haversineKm(lat, lng, pLat, pLng) <= radiusKm;
      });
    }

    partners.sort((a, b) => Number(b.reliabilityScore || 0) - Number(a.reliabilityScore || 0));
    return NextResponse.json(partners);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list available partners.' }, { status: 500 });
  }
}

