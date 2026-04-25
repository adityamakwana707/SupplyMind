import * as React from 'react';

interface ForgotPasswordEmailProps {
  userName: string;
  resetUrl: string;
}

export function ForgotPasswordEmail({ userName, resetUrl }: ForgotPasswordEmailProps) {
  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: 'center',
          borderBottom: '1px solid #eee',
          paddingBottom: '20px',
          marginBottom: '30px',
        }}
      >
        <h1
          style={{
            color: '#2563eb',
            fontSize: '32px',
            margin: '0',
            fontWeight: 'bold',
          }}
        >
          StockMaster
        </h1>
        <p
          style={{
            color: '#666',
            margin: '5px 0',
            fontSize: '14px',
          }}
        >
          Inventory Management System
        </p>
      </div>

      {/* Main Content */}
      <h2
        style={{
          color: '#333',
          marginBottom: '20px',
          fontSize: '24px',
        }}
      >
        Password Reset Request
      </h2>

      <p
        style={{
          color: '#555',
          lineHeight: '1.6',
          marginBottom: '20px',
        }}
      >
        Hi {userName},
      </p>

      <p
        style={{
          color: '#555',
          lineHeight: '1.6',
          marginBottom: '20px',
        }}
      >
        You requested a password reset for your StockMaster account. Click the button below to reset your password:
      </p>

      {/* Reset Button */}
      <div style={{ textAlign: 'center', margin: '30px 0' }}>
        <a
          href={resetUrl}
          style={{
            display: 'inline-block',
            backgroundColor: '#2563eb',
            color: 'white',
            padding: '15px 30px',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '16px',
          }}
        >
          Reset Password
        </a>
      </div>

      <p
        style={{
          color: '#555',
          lineHeight: '1.6',
          marginBottom: '10px',
        }}
      >
        If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
      </p>

      <p
        style={{
          color: '#555',
          lineHeight: '1.6',
          marginBottom: '30px',
        }}
      >
        <strong>This link will expire in 1 hour for security reasons.</strong>
      </p>

      {/* Divider */}
      <hr
        style={{
          border: 'none',
          borderTop: '1px solid #eee',
          margin: '30px 0',
        }}
      />

      {/* Backup Link */}
      <div
        style={{
          backgroundColor: '#f8f9fa',
          padding: '15px',
          borderRadius: '6px',
          marginBottom: '20px',
        }}
      >
        <p
          style={{
            color: '#666',
            fontSize: '14px',
            margin: '0',
            lineHeight: '1.4',
          }}
        >
          <strong>Trouble with the button?</strong>
          <br />
          Copy and paste this URL into your browser:
          <br />
          <a
            href={resetUrl}
            style={{
              color: '#2563eb',
              wordBreak: 'break-all',
            }}
          >
            {resetUrl}
          </a>
        </p>
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: 'center',
          borderTop: '1px solid #eee',
          paddingTop: '20px',
        }}
      >
        <p
          style={{
            color: '#999',
            fontSize: '12px',
            margin: '0',
          }}
        >
          This email was sent by StockMaster Inventory Management System
        </p>
      </div>
    </div>
  );
}
