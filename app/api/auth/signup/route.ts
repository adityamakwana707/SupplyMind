import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await adminDb.collection('users').where('email', '==', email.toLowerCase()).limit(1).get();
    if (!existing.empty) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: email.toLowerCase(),
      password,
      displayName: name,
    });

    // Create user in Firestore with PENDING status and null role
    const docRef = adminDb.collection('users').doc(userRecord.uid);
    await docRef.set({
      name,
      email: email.toLowerCase(),
      status: 'PENDING',
      role: null, // No role assigned yet - admin will assign during approval
      assignedWarehouses: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json(
      {
        message: 'Registration successful. Your account is pending approval by an administrator.',
        userId: userRecord.uid,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Signup error:', error);
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}
