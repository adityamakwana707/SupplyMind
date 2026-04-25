// Test route for Resend email functionality
// Visit: http://localhost:3000/api/test-email

import { NextRequest, NextResponse } from 'next/server';
import EmailService from '@/lib/services/emailService';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Resend email service...');
    
    const testEmail = 'nirmaldarekar90@gmail.com';
    const userName = 'Test User';
    const resetUrl = 'http://localhost:3000/auth/reset-password?token=test-123';
    
    // Test the forgot password email
    const emailSent = await EmailService.sendForgotPasswordEmail(
      testEmail,
      userName,
      resetUrl
    );
    
    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully!',
        details: {
          to: testEmail,
          userName,
          resetUrl,
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send test email',
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
