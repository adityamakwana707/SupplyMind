// Email service utility for StockMaster
// Using Resend for email delivery

import { Resend } from 'resend';
import { ForgotPasswordEmail } from '@/components/emails/ForgotPasswordEmail';

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  react?: React.ReactElement;
  text?: string;
}

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export class EmailService {
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // For development - log to console
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Email Service - Development Mode');
        console.log('To:', options.to);
        console.log('Subject:', options.subject);
        if (options.html) {
          console.log('HTML:', options.html);
        }
        
        // If Resend is configured, also try to send the actual email
        if (resend && process.env.RESEND_API_KEY) {
          console.log('🚀 Attempting to send via Resend...');
          // Continue to actual sending logic below
        } else {
          console.log('⚠️ Resend not configured, email logged only');
          return true;
        }
      }

      // Production email sending with Resend
      if (!resend || !process.env.RESEND_API_KEY) {
        if (process.env.NODE_ENV !== 'development') {
          console.log('⚠️ Resend API key not configured');
        }
        return false;
      }

      // Ensure proper email format for Resend
      let fromEmail = process.env.FROM_EMAIL || 'StockMaster <onboarding@resend.dev>';
      
      // Validate email format - Resend requires email@domain.com or Name <email@domain.com>
      if (!fromEmail.includes('@') || (!fromEmail.includes('<') && !fromEmail.match(/^[^@]+@[^@]+\.[^@]+$/))) {
        console.warn('⚠️ Invalid FROM_EMAIL format, using default Resend email');
        fromEmail = 'StockMaster <onboarding@resend.dev>';
      }
      
      const emailData: any = {
        from: fromEmail,
        to: options.to,
        subject: options.subject,
      };

      // Use React component if provided, otherwise use HTML
      if (options.react) {
        console.log('🎨 Using React email component...');
        emailData.react = options.react;
      } else if (options.html) {
        emailData.html = options.html;
      }

      if (options.text) {
        emailData.text = options.text;
      }

      const { data, error } = await resend.emails.send(emailData);

      if (error) {
        console.error('Resend error:', error);
        return false;
      }

      console.log('✅ Email sent successfully via Resend:', data?.id);
      return true;
      
    } catch (error) {
      console.error('Email service error:', error);
      return false;
    }
  }

  static async sendForgotPasswordEmail(userEmail: string, userName: string, resetUrl: string): Promise<boolean> {
    try {
      return await this.sendEmail({
        to: userEmail,
        subject: 'Password Reset - StockMaster',
        react: ForgotPasswordEmail({ userName, resetUrl }),
      });
    } catch (error) {
      console.error('Forgot password email error:', error);
      
      // Fallback to HTML template if React component fails
      console.log('📧 Falling back to HTML email template...');
      try {
        const htmlContent = this.generatePasswordResetEmail(userName, resetUrl);
        
        return await this.sendEmail({
          to: userEmail,
          subject: 'Password Reset - StockMaster',
          html: htmlContent,
        });
      } catch (htmlError) {
        console.error('HTML email fallback also failed:', htmlError);
        return false;
      }
    }
  }

  // Legacy method for backward compatibility
  static generatePasswordResetEmail(userName: string, resetUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="color: #2563eb; font-size: 32px; margin: 0;">StockMaster</h1>
          <p style="color: #666; margin: 5px 0;">Inventory Management System</p>
        </div>
        
        <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
        
        <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
          Hi ${userName},
        </p>
        
        <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
          You requested a password reset for your StockMaster account. Click the button below to reset your password:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="display: inline-block; 
                    background-color: #2563eb; 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: bold;
                    font-size: 16px;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #555; line-height: 1.6; margin-bottom: 10px;">
          If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
        </p>
        
        <p style="color: #555; line-height: 1.6; margin-bottom: 30px;">
          <strong>This link will expire in 1 hour for security reasons.</strong>
        </p>
        
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <p style="color: #666; font-size: 14px; margin: 0; line-height: 1.4;">
            <strong>Trouble with the button?</strong><br>
            Copy and paste this URL into your browser:<br>
            <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
          </p>
        </div>
        
        <div style="text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            This email was sent by StockMaster Inventory Management System
          </p>
        </div>
      </div>
    `;
  }
}

export default EmailService;
