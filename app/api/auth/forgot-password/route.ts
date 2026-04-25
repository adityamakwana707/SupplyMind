import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import crypto from 'crypto';
import EmailService from '@/lib/services/emailService';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const snapshot = await adminDb.collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); 

    await userDoc.ref.update({
      resetToken,
      resetTokenExpiry,
      updatedAt: new Date()
    });

    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

    const emailSent = await EmailService.sendForgotPasswordEmail(
      email.toLowerCase(),
      userData.name,
      resetUrl
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('🔑 Password Reset Link for', email, ':', resetUrl);
      console.log('📬 Email sent via Resend:', emailSent ? 'Success' : 'Failed');
    }

    return NextResponse.json({ message: 'If an account with that email exists, a reset link has been sent.' });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
