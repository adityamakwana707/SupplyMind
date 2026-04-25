import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import { adminDb } from '@/lib/firebase/admin';
import { initCron } from '@/lib/services/cronService';
import { createShipmentForBusiness, validateCreateShipmentBody } from '@/lib/services/shipmentService';

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

export async function GET(request: NextRequest) {
  try {
    // Initialize background risk bot on first request
    initCron();
    const session = await getServerSessionFirebase();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const vendorIdParam = searchParams.get('vendorId');
    
    // Role-based scoping
    const userRole = (session.user as any).role;
    const userVendorId = (session.user as any).vendorId;
    
    let shipmentsRef: any = adminDb.collection('shipments');
    
    if (status) {
      shipmentsRef = shipmentsRef.where('status', '==', status);
    }
    if (type) {
      shipmentsRef = shipmentsRef.where('type', '==', type);
    }

    const snapshot = await shipmentsRef.get();
    
    let shipments = snapshot.docs.map((doc: any) => ({
      _id: doc.id,
      id: doc.id,
      ...doc.data()
    }));

    // Post-query filtering for vendorId (Mandatory for VENDOR role)
    if (userRole === 'VENDOR' && userVendorId) {
       shipments = shipments.filter((sh: any) => 
          sh.origin?.vendorId === userVendorId || sh.vendorId === userVendorId
       );
    } else if (vendorIdParam) {
       shipments = shipments.filter((sh: any) => 
          sh.origin?.vendorId === vendorIdParam || sh.vendorId === vendorIdParam
       );
    }

    // Manual sort by createdAt descending
    shipments.sort((a: any, b: any) => {
      const getTime = (val: any) => {
        if (!val) return 0;
        if (val.seconds) return val.seconds * 1000;
        return new Date(val).getTime();
      };
      
      return getTime(b.createdAt) - getTime(a.createdAt);
    });

    return NextResponse.json(shipments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list shipments.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    if (!['ADMIN', 'MANAGER'].includes(userRole || '')) {
      return NextResponse.json(
        { error: 'Forbidden. Only ADMIN or MANAGER can create shipments.' },
        { status: 403 }
      );
    }

    const businessId = (session.user as any).businessId;
    if (!isNonEmptyString(businessId)) {
      return NextResponse.json(
        { error: 'Missing businessId in session. Cannot scope shipment.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = validateCreateShipmentBody(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const payload = validation.data;
    const createdSnapshot = await createShipmentForBusiness(businessId, payload);
    return NextResponse.json(
      createdSnapshot,
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create shipment.' },
      { status: 500 }
    );
  }
}
