import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';
import { Client } from '@googlemaps/google-maps-services-js';
import { decode } from '@googlemaps/polyline-codec';
import { mapsDirectionsLimit } from '@/lib/rateLimit';

const directionsClient = new Client({});

const toNumber = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMIN', 'MANAGER'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const shipmentRef = adminDb.collection('shipments').doc(id);
    const shipmentSnap = await shipmentRef.get();
    if (!shipmentSnap.exists) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    const shipment = shipmentSnap.data() as any;

    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!mapsKey) return NextResponse.json({ error: 'GOOGLE_MAPS_API_KEY is missing.' }, { status: 500 });

    const currentLat = toNumber(shipment.currentLat);
    const currentLng = toNumber(shipment.currentLng);
    const destLat = toNumber(shipment?.destination?.lat ?? shipment?.destination?.latitude);
    const destLng = toNumber(shipment?.destination?.lng ?? shipment?.destination?.longitude);
    if (currentLat === null || currentLng === null || destLat === null || destLng === null) {
      return NextResponse.json({ error: 'Shipment must have current and destination coordinates.' }, { status: 400 });
    }

    const routeResult = await mapsDirectionsLimit.waitAndCall(() =>
      directionsClient.directions({
        params: {
          origin: { lat: currentLat, lng: currentLng },
          destination: { lat: destLat, lng: destLng },
          departure_time: Math.floor(Date.now() / 1000),
          alternatives: true,
          key: mapsKey
        }
      })
    );
    if (routeResult === null) {
      return NextResponse.json({ error: 'Route computation temporarily rate limited. Retry shortly.' }, { status: 429 });
    }

    const routes = routeResult.data.routes || [];
    if (!routes.length) return NextResponse.json({ error: 'No route returned by Google Maps.' }, { status: 400 });

    const selectedRoute = routes.reduce((best: any, current: any) => {
      const cur = Number(current?.legs?.[0]?.duration_in_traffic?.value ?? Number.MAX_SAFE_INTEGER);
      const bst = Number(best?.legs?.[0]?.duration_in_traffic?.value ?? Number.MAX_SAFE_INTEGER);
      return cur < bst ? current : best;
    }, routes[0]);

    const duration = Number(selectedRoute?.legs?.[0]?.duration_in_traffic?.value);
    const polyline = selectedRoute?.overview_polyline?.points;
    if (!Number.isFinite(duration) || !polyline) {
      return NextResponse.json({ error: 'Selected route missing duration or geometry.' }, { status: 400 });
    }

    const path = decode(polyline).map(([lat, lng]) => ({ lat, lng }));
    const eta = new Date(Date.now() + duration * 1000).toISOString();
    await shipmentRef.update({
      routeGeometry: path,
      eta,
      rerouteNotification: {
        newRoute: {
          summary: selectedRoute.summary || 'Alternate route selected',
          durationInTrafficSeconds: duration,
          distanceMeters: Number(selectedRoute?.legs?.[0]?.distance?.value || 0)
        },
        newEta: eta,
        notifiedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, eta, points: path.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to reroute shipment.' }, { status: 500 });
  }
}

