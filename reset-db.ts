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

async function runReset() {
  console.log("🗑️ Resetting Database...");
  const collections = [
    'warehouses', 'products', 'shipments', 'decisions', 
    'stockMovements', 'stockLevels', 'deliveries', 
    'requisitions', 'transfers', 'transportPartners', 'auditLogs'
  ];
  
  for (const col of collections) {
    await clearCollection(col);
  }
  console.log("✅ Database Reset Complete.");
}

runReset().catch(console.error);
