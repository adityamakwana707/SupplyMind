import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const warehousesSnapshot = await adminDb
      .collection('warehouses')
      .where('isActive', '==', true)
      .get();
      
    const warehouses = warehousesSnapshot.docs
      .map(doc => ({
        _id: doc.id,
        ...doc.data()
      }))
      .sort((a: any, b: any) => String(a.name || '').localeCompare(String(b.name || '')));

    return NextResponse.json(warehouses);
  } catch (error: any) {
    console.error('Failed to fetch warehouses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    const userRole = (session as any)?.user?.role || (session as any)?.role;
    if (!session || userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, address, description } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for existing code
    const existing = await adminDb.collection('warehouses').where('code', '==', code).get();
    if (!existing.empty) {
      return NextResponse.json({ error: 'Warehouse code already exists' }, { status: 400 });
    }

    let finalAddress = address || '';
    let coordinates = null;

    if (address && process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const validateUrl = `https://addressvalidation.googleapis.com/v1:validateAddress?key=${process.env.GOOGLE_MAPS_API_KEY}`;
        const validateRes = await fetch(validateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: { addressLines: [address] }
          })
        });

        if (validateRes.ok) {
          const validateData = await validateRes.json();
          const result = validateData.result;
          if (result && result.address) {
            finalAddress = result.address.formattedAddress || address;
            if (result.geocode && result.geocode.location) {
              coordinates = {
                lat: result.geocode.location.latitude,
                lng: result.geocode.location.longitude
              };
            }
          }
        }
      } catch (e) {
        console.error('Address validation failed:', e);
      }
    }

    const warehouseData: any = {
      name,
      code,
      address: finalAddress,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (description) warehouseData.description = description;
    if (coordinates) {
      warehouseData.lat = coordinates.lat;
      warehouseData.lng = coordinates.lng;
      warehouseData.coordinates = coordinates;

      // Time Zone API: Get local timezone for the warehouse
      try {
        const tzUrl = `https://maps.googleapis.com/maps/api/timezone/json?location=${coordinates.lat},${coordinates.lng}&timestamp=${Math.floor(Date.now() / 1000)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
        const tzRes = await fetch(tzUrl);
        if (tzRes.ok) {
          const tzData = await tzRes.json();
          if (tzData.status === 'OK') {
            warehouseData.timezoneId = tzData.timeZoneId;
            warehouseData.timezoneName = tzData.timeZoneName;
          }
        }
      } catch (e) {
        console.error('Time Zone API failed:', e);
      }
    }

    const docRef = await adminDb.collection('warehouses').add(warehouseData);
    
    return NextResponse.json({ _id: docRef.id, ...warehouseData }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

