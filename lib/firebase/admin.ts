import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  const hasServiceAccount = Boolean(projectId && clientEmail && privateKey);

  admin.initializeApp({
    credential: hasServiceAccount
      ? admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        })
      : admin.credential.applicationDefault(),
  });
}
const app = admin.app();
export const adminAuth = admin.auth(app);
export const adminDb = admin.firestore(app);

export { admin };
