import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { mapsDistanceLimit } from '@/lib/rateLimit';
import { logEvent } from '@/lib/services/loggerService';

const ETA_SHIFT_THRESHOLD_MINUTES = 15;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSessionFirebase();
    const sharedTrackingToken = process.env.DRIVER_TRACKING_TOKEN;
    const tokenFromHeader = request.headers.get('x-driver-token');
    const hasValidToken = Boolean(sharedTrackingToken && tokenFromHeader === sharedTrackingToken);
    const hasSessionAccess = Boolean(
      session && ['ADMIN', 'MANAGER', 'TRANSPORT'].includes(session.user.role || '')
    );
    if (!hasValidToken && !hasSessionAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lat, lng, speed, heading, timestamp, isResting } = await request.json();
    let latNum = Number(lat);
    let lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return NextResponse.json({ error: 'lat/lng must be valid numbers.' }, { status: 400 });
    }

    const { id } = await params;
    const shipmentRef = adminDb.collection('shipments').doc(id);
    const shipmentSnap = await shipmentRef.get();

    if (!shipmentSnap.exists) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const shipment = shipmentSnap.data() as any;

    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;

    // Optional: Snap to Roads API
    if (mapsKey) {
      try {
        const snapUrl = `https://roads.googleapis.com/v1/snapToRoads?path=${latNum},${lngNum}&interpolate=false&key=${mapsKey}`;
        const snapRes = await fetch(snapUrl);
        if (snapRes.ok) {
          const snapData = await snapRes.json();
          if (snapData.snappedPoints && snapData.snappedPoints.length > 0) {
            const point = snapData.snappedPoints[0].location;
            if (point.latitude && point.longitude) {
              latNum = Number(point.latitude);
              lngNum = Number(point.longitude);
            }
          }
        }
      } catch (err: any) {
        await logEvent('WARNING', `Roads API snap failed for ${id}`, { error: err.message });
      }
    }

    // Write location ping
    await adminDb.collection('locationPings').add({
      shipmentId: id,
      lat: latNum,
      lng: lngNum,
      speed: Number.isFinite(Number(speed)) ? Number(speed) : 0,
      heading: Number.isFinite(Number(heading)) ? Number(heading) : 0,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    // Update shipment current coordinates
    const updatePayload: Record<string, any> = {
      currentLat: latNum,
      currentLng: lngNum,
      currentSpeed: Number.isFinite(Number(speed)) ? Number(speed) : 0,
      heading: Number.isFinite(Number(heading)) ? Number(heading) : 0,
      isResting: isResting || false,
      updatedAt: new Date().toISOString()
    };

    // SPEC Flow 1 Step 5: Recompute ETA via Maps Distance Matrix on every ping
    const destinationWarehouseId = shipment?.destination?.warehouseId;

    if (destinationWarehouseId && mapsKey) {
      try {
        const warehouseDoc = await adminDb.collection('warehouses').doc(destinationWarehouseId).get();
        const warehouseData = warehouseDoc.exists ? warehouseDoc.data() as any : null;
        const destLat = Number(warehouseData?.lat ?? warehouseData?.latitude);
        const destLng = Number(warehouseData?.lng ?? warehouseData?.longitude);

        if (Number.isFinite(destLat) && Number.isFinite(destLng)) {
          const newEtaResult = await mapsDistanceLimit.waitAndCall(async () => {
            const endpoint = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
            endpoint.searchParams.set('origins', `${latNum},${lngNum}`);
            endpoint.searchParams.set('destinations', `${destLat},${destLng}`);
            endpoint.searchParams.set('departure_time', `${Math.floor(Date.now() / 1000)}`);
            endpoint.searchParams.set('traffic_model', 'best_guess');
            endpoint.searchParams.set('key', mapsKey);

            const response = await fetch(endpoint.toString());
            if (!response.ok) return null;
            const payload = await response.json();
            if (payload.status !== 'OK') return null;

            const element = payload.rows?.[0]?.elements?.[0];
            if (!element || element.status !== 'OK') return null;

            const liveDurationSeconds = Number(element.duration_in_traffic?.value ?? element.duration?.value);
            if (!Number.isFinite(liveDurationSeconds)) return null;

            return new Date(Date.now() + liveDurationSeconds * 1000).toISOString();
          });

          if (newEtaResult) {
            // SPEC: If new ETA differs from previous by > 15 minutes, update dock schedule
            const prevEtaRaw = shipment.eta;
            const prevEta = prevEtaRaw?.toDate ? prevEtaRaw.toDate() : (prevEtaRaw ? new Date(prevEtaRaw) : null);
            const newEtaDate = new Date(newEtaResult);

            updatePayload.eta = newEtaResult;

            if (prevEta && Math.abs(newEtaDate.getTime() - prevEta.getTime()) > ETA_SHIFT_THRESHOLD_MINUTES * 60000) {
              await logEvent('INFO', `ETA shifted > ${ETA_SHIFT_THRESHOLD_MINUTES} min for ${id} — auto-updating dock schedule`, {
                shipmentId: id,
                prevEta: prevEta.toISOString(),
                newEta: newEtaResult
              });

              // Find and update dock slot
              const dockSnap = await adminDb.collection('dockSchedules')
                .where('warehouseId', '==', destinationWarehouseId)
                .get();

              for (const dockDoc of dockSnap.docs) {
                const slots = (dockDoc.data().slots || []) as any[];
                const slotIdx = slots.findIndex((s: any) => s.shipmentId === id);
                if (slotIdx >= 0) {
                  slots[slotIdx] = {
                    ...slots[slotIdx],
                    slotTime: newEtaResult,
                    status: 'ETA_SHIFTED',
                    updatedAt: new Date().toISOString()
                  };
                  await dockDoc.ref.update({ slots, updatedAt: new Date().toISOString() });
                  break;
                }
              }
            }
          }
        }
      } catch (etaError: any) {
        // Non-fatal — still save the coordinates
        await logEvent('WARNING', `ETA recompute failed on GPS ping for ${id}`, { error: etaError.message });
      }
    }

    await shipmentRef.update(updatePayload);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
