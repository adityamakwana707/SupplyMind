// Simple test page to verify email template rendering
// Visit: http://localhost:3000/test-email-template

'use client';

import { ForgotPasswordEmail } from '@/components/emails/ForgotPasswordEmail';

export default function TestEmailTemplatePage() {
  const testProps = {
    userName: 'John Doe',
    resetUrl: 'http://localhost:3000/auth/reset-password?token=sample-token-123',
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Email Template Preview</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Forgot Password Email Template</h2>
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <ForgotPasswordEmail {...testProps} />
          </div>
        </div>
        
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Template Props</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm">
            {JSON.stringify(testProps, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
