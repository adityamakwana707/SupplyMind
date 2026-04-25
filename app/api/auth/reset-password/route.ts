import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const snapshot = await adminDb.collection('users')
      .where('resetToken', '==', token)
      .where('resetTokenExpiry', '>', new Date())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    const userDoc = snapshot.docs[0];

    try {
      await adminAuth.updateUser(userDoc.id, { password });
    } catch (err: any) {
      console.error('Firebase Auth update failed:', err);
      return NextResponse.json({ error: 'Internal server error attempting to update auth' }, { status: 500 });
    }

    await userDoc.ref.update({
      resetToken: null,
      resetTokenExpiry: null,
      updatedAt: new Date()
    });

    return NextResponse.json({ message: 'Password has been reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const snapshot = await adminDb.collection('users')
      .where('resetToken', '==', token)
      .where('resetTokenExpiry', '>', new Date())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    return NextResponse.json({ valid: true, message: 'Token is valid' });

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
