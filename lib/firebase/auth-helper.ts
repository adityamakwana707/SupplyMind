import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { User } from '@/lib/firebase/db';

export async function getServerSessionFirebase() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  if (!sessionCookie) return null;

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    // Fetch the full User document to get roles and permissions
    const userDoc = await adminDb.collection('users').doc(decodedClaims.uid).get();
    
    if (!userDoc.exists) return null;

    const userData = userDoc.data() as User;
    
    return {
      user: {
        id: decodedClaims.uid,
        email: decodedClaims.email,
        name: userData.name || decodedClaims.name,
        businessId: (userData as any).businessId || null,
        role: userData.role,
        status: userData.status,
        assignedWarehouses: userData.assignedWarehouses || [],
        primaryWarehouseId: userData.primaryWarehouseId || null,
        vendorId: (userData as any).vendorId || null,
        partnerId: (userData as any).partnerId || null,
      }
    };
  } catch (error) {
    return null;
  }
}
