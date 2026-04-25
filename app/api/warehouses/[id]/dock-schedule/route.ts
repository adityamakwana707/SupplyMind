import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { startOfDay, endOfDay, addDays, parseISO, format } from 'date-fns';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const warehouseId = id;
    const warehouseDoc = await adminDb.collection('warehouses').doc(warehouseId).get();
    
    if (!warehouseDoc.exists) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    const warehouseData = warehouseDoc.data();
    const capacity = warehouseData?.dockCapacity || 2;

    const today = startOfDay(new Date());
    const tomorrowEnd = endOfDay(addDays(today, 1));

    const persistedSchedules = await adminDb.collection('dockSchedules')
      .where('warehouseId', '==', warehouseId)
      .get();

    let sortedSlots: any[] = [];
    if (!persistedSchedules.empty) {
      const allSlots = persistedSchedules.docs.flatMap((doc) => {
        const data = doc.data() as any;
        const slots = Array.isArray(data.slots) ? data.slots : [];
        return slots.map((slot: any, index: number) => {
          const slotTime = slot.slotTime || slot.time;
          const parsed = parseISO(slotTime);
          return {
            slotId: slot.slotId || `${doc.id}-${index}`,
            slotTime,
            time: slotTime,
            displayTime: format(parsed, 'MMM d, HH:mm'),
            dockNumber: slot.dockNumber || 1,
            status: slot.status || 'SCHEDULED',
            shipments: slot.shipmentId
              ? [{ id: slot.shipmentId, type: slot.cargoType || 'N/A', status: slot.status || 'SCHEDULED', riskScore: slot.riskScore || 0 }]
              : [],
            occupancy: slot.shipmentId ? 1 : 0,
            atCapacity: false
          };
        });
      });

      sortedSlots = allSlots
        .filter((slot) => {
          const slotDate = parseISO(slot.time);
          return slotDate >= today && slotDate <= tomorrowEnd;
        })
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

      const occupancyByHour = new Map<string, number>();
      sortedSlots.forEach((slot) => {
        const hourKey = format(parseISO(slot.time), "yyyy-MM-dd'T'HH");
        const occupancy = (occupancyByHour.get(hourKey) || 0) + slot.occupancy;
        occupancyByHour.set(hourKey, occupancy);
      });
      sortedSlots = sortedSlots.map((slot) => {
        const hourKey = format(parseISO(slot.time), "yyyy-MM-dd'T'HH");
        const occupancy = occupancyByHour.get(hourKey) || 0;
        return {
          ...slot,
          occupancy,
          atCapacity: occupancy >= capacity
        };
      });
    } else {
      const shipmentsSnap = await adminDb.collection('shipments')
        .where('destination.warehouseId', '==', warehouseId)
        .where('status', 'in', ['IN_TRANSIT', 'DISPATCHED', 'HELD_IN_CUSTOMS'])
        .get();
      const shipments = shipmentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const schedule: Record<string, any> = {};
      for (let i = 0; i < 48; i++) {
        const slotTime = new Date(today.getTime() + i * 3600000);
        const slotKey = slotTime.toISOString();
        schedule[slotKey] = {
          slotId: `slot-${slotTime.toISOString()}`,
          slotTime: slotTime.toISOString(),
          time: slotTime.toISOString(),
          displayTime: format(slotTime, 'MMM d, HH:00'),
          dockNumber: 1,
          status: 'SCHEDULED',
          shipments: [],
          occupancy: 0,
          atCapacity: false
        };
      }

      shipments.forEach((sh: any) => {
        if (!sh.eta) return;
        const etaDate = parseISO(sh.eta);
        if (etaDate >= today && etaDate <= tomorrowEnd) {
          const slotTime = new Date(etaDate);
          slotTime.setMinutes(0, 0, 0);
          const slotKey = slotTime.toISOString();
          if (schedule[slotKey]) {
            schedule[slotKey].shipments.push({
              id: sh.id,
              type: sh.type,
              status: sh.status,
              riskScore: sh.riskScore
            });
            schedule[slotKey].occupancy++;
            schedule[slotKey].atCapacity = schedule[slotKey].occupancy >= capacity;
          }
        }
      });

      sortedSlots = Object.values(schedule).sort((a: any, b: any) =>
        new Date(a.time).getTime() - new Date(b.time).getTime()
      );
    }

    return NextResponse.json({
        warehouseId,
        warehouseName: warehouseData?.name,
        capacity,
        schedule: sortedSlots
    });
  } catch (error: any) {
    console.error('Dock schedule error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
