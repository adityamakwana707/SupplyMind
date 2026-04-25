import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    })
  });
}
const db = admin.firestore();

async function clearCollection(collectionPath: string) {
  const collectionRef = db.collection(collectionPath);
  const snapshot = await collectionRef.get();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log(`Cleared ${collectionPath}`);
}

async function runSeed() {
  console.log("🌱 Seeding Extended Golden Demo Data (India Edition)...");

  // 1. Clear operational data (Keep users)
  await clearCollection('warehouses');
  await clearCollection('products');
  await clearCollection('shipments');
  await clearCollection('decisions');
  await clearCollection('stockMovements');
  await clearCollection('stockLevels');
  await clearCollection('deliveries');
  await clearCollection('requisitions');
  await clearCollection('transfers');
  await clearCollection('transportPartners');

  // 2. Create Warehouses (Indian Cities)
  const warehouses = [
    { id: 'WH_MUM', code: 'WH_MUM', name: 'Mumbai Central Hub', type: 'PORT_HUB', lat: 19.0760, lng: 72.8777 },
    { id: 'WH_DEL', code: 'WH_DEL', name: 'Delhi Logistics Park', type: 'DISTRIBUTION_CENTER', lat: 28.6139, lng: 77.2090 },
    { id: 'WH_BLR', code: 'WH_BLR', name: 'Bangalore Tech DC', type: 'REGIONAL_CENTER', lat: 12.9716, lng: 77.5946 },
    { id: 'WH_MAA', code: 'WH_MAA', name: 'Chennai Port Terminal', type: 'PORT_HUB', lat: 13.0827, lng: 80.2707 },
    { id: 'WH_CCU', code: 'WH_CCU', name: 'Kolkata Gateway', type: 'DISTRIBUTION_CENTER', lat: 22.5726, lng: 88.3639 },
    { id: 'WH_PNQ', code: 'WH_PNQ', name: 'Pune Regional Hub', type: 'REGIONAL_CENTER', lat: 18.5204, lng: 73.8567 },
    { id: 'WH_HYD', code: 'WH_HYD', name: 'Hyderabad Pharma DC', type: 'REGIONAL_CENTER', lat: 17.3850, lng: 78.4867 }
  ];

  const batch = db.batch();

  warehouses.forEach(wh => {
    const ref = db.collection('warehouses').doc(wh.id);
    batch.set(ref, {
      code: wh.code,
      name: wh.name,
      type: wh.type,
      location: { address: `${wh.name} Area`, lat: wh.lat, lng: wh.lng },
      capacity: 100000,
      status: 'ACTIVE',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  // 3. Create High-Value Products
  const products = [
    { id: 'PROD_VENT', sku: 'VENT-5000', name: 'Critical Care Ventilators', category: 'MEDICAL_EQUIPMENT', price: 15000, unit: 'units' },
    { id: 'PROD_MASK', sku: 'MASK-N95', name: 'Surgical N95 Kits', category: 'CONSUMABLES', price: 50, unit: 'boxes' },
    { id: 'PROD_INS', sku: 'INS-TEMP', name: 'Insulin Cold-Chain', category: 'PHARMA', price: 1200, unit: 'vials' },
    { id: 'PROD_OXY', sku: 'OXY-GEN', name: 'Oxygen Concentrators', category: 'MEDICAL_EQUIPMENT', price: 2500, unit: 'units' }
  ];

  products.forEach(p => {
    const ref = db.collection('products').doc(p.id);
    batch.set(ref, {
      sku: p.sku,
      name: p.name,
      category: p.category,
      unit: p.unit,
      price: p.price,
      reorderLevel: 50,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  // 4. Update users
  const usersSnap = await db.collection('users').get();
  for (const doc of usersSnap.docs) {
    const user = doc.data();
    if (user.role === 'MANAGER') {
      batch.update(doc.ref, {
        primaryWarehouseId: 'WH_MUM',
        assignedWarehouses: ['WH_MIA', 'WH_MUM', 'WH_DEL', 'WH_BLR']
      });
    } else if (user.role === 'OPERATOR') {
      batch.update(doc.ref, {
        primaryWarehouseId: 'WH_HYD',
        assignedWarehouses: ['WH_HYD', 'WH_MAA', 'WH_PNQ']
      });
    }
  }

  // 5. Create Shipments (Active, Successful, Failed)
  // Added currentLat and currentLng so they show on map
  const activeShipments = [
    {
      id: 'SHIP-CRISIS-99',
      origin: 'WH_MUM',
      dest: 'WH_DEL',
      status: 'IN_TRANSIT',
      risk: 88,
      cargo: [{ productId: 'PROD_VENT', quantity: 33 }],
      eta: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      currentLat: 22.0, lng: 75.0, // Somewhere between Mumbai and Delhi
      reason: 'Heavy monsoon flooding detected on National Highway 48'
    },
    {
      id: 'SHIP-RISK-01',
      origin: 'WH_DEL',
      dest: 'WH_CCU',
      status: 'IN_TRANSIT',
      risk: 75,
      cargo: [{ productId: 'PROD_INS', quantity: 500 }],
      eta: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      currentLat: 25.0, lng: 82.0, // Somewhere near Varanasi
      reason: 'Dense fog conditions causing massive traffic backlog'
    },
    {
      id: 'SHIP-RISK-02',
      origin: 'WH_BLR',
      dest: 'WH_MAA',
      status: 'IN_TRANSIT',
      risk: 62,
      cargo: [{ productId: 'PROD_OXY', quantity: 150 }],
      eta: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      currentLat: 13.0, lng: 78.5, // Between Bangalore and Chennai
      reason: 'Protest activity near state border causing diversions'
    },
    {
      id: 'SHIP-OK-01',
      origin: 'WH_HYD',
      dest: 'WH_PNQ',
      status: 'IN_TRANSIT',
      risk: 12,
      cargo: [{ productId: 'PROD_MASK', quantity: 2000 }],
      eta: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      currentLat: 18.0, lng: 75.0,
      reason: 'Clear skies, optimal route'
    }
  ];

  activeShipments.forEach(s => {
    const ref = db.collection('shipments').doc(s.id);
    batch.set(ref, {
      shipmentId: s.id,
      type: 'TRANSFER',
      origin: { type: 'WAREHOUSE', warehouseId: s.origin },
      destination: { type: 'WAREHOUSE', warehouseId: s.dest },
      cargo: s.cargo,
      status: s.status,
      eta: s.eta,
      currentLat: s.currentLat,
      currentLng: (s as any).lng || 0, // Fixing the typo in my object
      riskScore: s.risk,
      riskHistory: [
        { timestamp: new Date(Date.now() - 3600000).toISOString(), score: 10, reason: 'Departure' },
        { timestamp: new Date().toISOString(), score: s.risk, reason: s.reason }
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  const pastShipments = [
    {
      id: 'SHIP-DONE-01',
      origin: 'WH_PNQ',
      dest: 'WH_MUM',
      status: 'DONE',
      risk: 5,
      cargo: [{ productId: 'PROD_MASK', quantity: 5000 }],
      deliveredAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'SHIP-DONE-02',
      origin: 'WH_HYD',
      dest: 'WH_BLR',
      status: 'DONE',
      risk: 8,
      cargo: [{ productId: 'PROD_INS', quantity: 200 }],
      deliveredAt: new Date(Date.now() - 172800000).toISOString()
    },
    {
      id: 'SHIP-FAIL-01',
      origin: 'WH_MAA',
      dest: 'WH_HYD',
      status: 'DELAYED',
      risk: 98,
      cargo: [{ productId: 'PROD_VENT', quantity: 10 }],
      reason: 'Engine failure + Remote location breakdown'
    }
  ];

  pastShipments.forEach(s => {
    const ref = db.collection('shipments').doc(s.id);
    batch.set(ref, {
      shipmentId: s.id,
      type: 'TRANSFER',
      origin: { type: 'WAREHOUSE', warehouseId: s.origin },
      destination: { type: 'WAREHOUSE', warehouseId: s.dest },
      cargo: s.cargo,
      status: s.status,
      riskScore: s.risk,
      riskHistory: [
        { timestamp: new Date().toISOString(), score: s.risk, reason: s.reason || 'Completed' }
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  // 6. Decision Card for SHIP-CRISIS-99
  const decisionRef = db.collection('decisions').doc('DECISION-CRISIS-99');
  batch.set(decisionRef, {
    shipmentId: 'SHIP-CRISIS-99',
    status: 'PENDING',
    options: [
      {
        type: 'REDISTRIBUTE',
        label: 'Redistribute from Hyderabad Pharma DC',
        summary: 'Pull 33 Critical Care Ventilators from WH_HYD inventory to fulfill Delhi requirements.',
        timeSavedMinutes: 180,
        costPremium: 8500,
      },
      {
        type: 'REROUTE',
        label: 'Reroute via State Highways',
        summary: 'Avoid NH-48 flooding by diverting through state bypasses.',
        timeSavedMinutes: -90,
        costPremium: 3000,
      }
    ],
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // 7. Initial Stocks
  warehouses.forEach(wh => {
    products.forEach(p => {
      const ref = db.collection('stockLevels').doc(`${wh.id}_${p.id}`);
      batch.set(ref, {
        warehouseId: wh.id,
        productId: p.id,
        quantity: Math.floor(Math.random() * 1000) + 100,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
  });

  // 8. Transport Partners
  const drivers = ['DRIVER_JONES', 'DRIVER_SMITH', 'DRIVER_DOE'];
  drivers.forEach(d => {
    const ref = db.collection('transportPartners').doc(d);
    batch.set(ref, {
      name: d.replace('DRIVER_', 'Logistics '),
      hoursLoggedToday: Math.random() * 8,
      status: 'ACTIVE'
    });
  });

  await batch.commit();
  console.log("✅ Extended Golden Demo Seed Complete (India Edition)!");
}

runSeed().catch(console.error);
