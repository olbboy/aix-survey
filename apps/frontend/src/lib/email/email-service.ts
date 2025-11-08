/**
 * Email Service
 * Handles email sending with Nodemailer and template rendering
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { renderTemplate } from './template-renderer';

export interface EmailOptions {
  to: string;
  toName?: string;
  subject: string;
  template: string;
  templateData: Record<string, any>;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email Service class
 */
export class EmailService {
  private transporter: Transporter;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    // Get SMTP configuration from environment
    const host = process.env.SMTP_HOST || 'localhost';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true'; // true for 465, false for other ports
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    this.fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@example.com';
    this.fromName = process.env.SMTP_FROM_NAME || 'AI Maturity Assessment';

    // Create transporter
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      // For development: log to console
      ...(process.env.NODE_ENV === 'development' && {
        streamTransport: process.env.SMTP_DEBUG === 'true',
        newline: 'unix',
        buffer: true,
      }),
    });
  }

  /**
   * Send email with template
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      // Render template
      const html = await renderTemplate(options.template, options.templateData);

      // Prepare email
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.toName ? `"${options.toName}" <${options.to}>` : options.to,
        subject: options.subject,
        html,
        attachments: options.attachments,
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      // Log for development
      if (process.env.NODE_ENV === 'development') {
        console.log('✉️  Email sent:', {
          to: options.to,
          subject: options.subject,
          messageId: info.messageId,
        });

        // If using streamTransport, log the message
        if (process.env.SMTP_DEBUG === 'true' && info.message) {
          console.log('📧 Email content:\n', info.message.toString());
        }
      }

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection failed:', error);
      return false;
    }
  }
}

/**
 * Singleton instance
 */
let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}

/**
 * Send assessment results email
 */
export async function sendAssessmentResultsEmail(
  recipientEmail: string,
  recipientName: string,
  assessmentData: {
    organizationName: string;
    totalScore: number;
    maturityLevel: string;
    completedAt: string;
    resultsUrl: string;
  },
  pdfAttachment?: {
    filename: string;
    content: Buffer;
  }
): Promise<EmailResult> {
  const emailService = getEmailService();

  return await emailService.sendEmail({
    to: recipientEmail,
    toName: recipientName,
    subject: `AI Maturity Assessment Results - ${assessmentData.organizationName}`,
    template: 'assessment-results',
    templateData: assessmentData,
    attachments: pdfAttachment
      ? [
          {
            filename: pdfAttachment.filename,
            content: pdfAttachment.content,
            contentType: 'application/pdf',
          },
        ]
      : undefined,
  });
}
