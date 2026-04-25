import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';

const toDate = (value: any): Date => {
  if (value?.toDate) return value.toDate();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid slotTime.');
  return parsed;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slotId: string }> }
) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ADMIN', 'MANAGER'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: warehouseId, slotId } = await params;
    const { slotTime, dockNumber, status } = await request.json();

    const schedulesSnap = await adminDb.collection('dockSchedules')
      .where('warehouseId', '==', warehouseId)
      .get();

    if (schedulesSnap.empty) {
      return NextResponse.json({ error: 'No dock schedule found for warehouse.' }, { status: 404 });
    }

    let matchedDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    let matchedSlotIndex = -1;
    let matchedSlots: any[] = [];

    for (const doc of schedulesSnap.docs) {
      const data = doc.data() as any;
      const slots = Array.isArray(data.slots) ? data.slots : [];
      const idx = slots.findIndex((slot: any) => slot.slotId === slotId);
      if (idx >= 0) {
        matchedDoc = doc;
        matchedSlotIndex = idx;
        matchedSlots = slots;
        break;
      }
    }

    if (!matchedDoc || matchedSlotIndex < 0) {
      return NextResponse.json({ error: 'Slot not found.' }, { status: 404 });
    }

    const currentSlot = matchedSlots[matchedSlotIndex];
    const nextSlotTime = slotTime ? toDate(slotTime) : toDate(currentSlot.slotTime || currentSlot.time);
    const nextDockNumber = dockNumber !== undefined ? Number(dockNumber) : Number(currentSlot.dockNumber || 1);
    const nextStatus = status !== undefined ? String(status) : String(currentSlot.status || 'SCHEDULED');

    const conflict = matchedSlots.find((slot: any, index: number) => {
      if (index === matchedSlotIndex) return false;
      const slotDock = Number(slot.dockNumber || 1);
      if (slotDock !== nextDockNumber) return false;
      const otherTime = toDate(slot.slotTime || slot.time);
      const diffMinutes = Math.abs(otherTime.getTime() - nextSlotTime.getTime()) / 60000;
      return diffMinutes <= 30;
    });

    if (conflict) {
      return NextResponse.json(
        {
          error: 'Dock conflict',
          conflictingSlotId: conflict.slotId,
          conflictingShipmentId: conflict.shipmentId || null
        },
        { status: 409 }
      );
    }

    matchedSlots[matchedSlotIndex] = {
      ...currentSlot,
      slotTime: nextSlotTime.toISOString(),
      time: nextSlotTime.toISOString(),
      dockNumber: nextDockNumber,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };

    await matchedDoc.ref.update({
      slots: matchedSlots,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({
      slotId,
      ...matchedSlots[matchedSlotIndex]
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update dock slot.' }, { status: 500 });
  }
}
