/**
 * better-auth Configuration
 * Handles email/password authentication with verification and password reset
 */

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '../db/prisma';
import nodemailer from 'nodemailer';

// Email transporter setup
const createEmailTransporter = () => {
  if (process.env.EMAIL_SERVER) {
    return nodemailer.createTransporter(process.env.EMAIL_SERVER);
  }

  // Development: Log emails to console
  return nodemailer.createTransporter({
    streamTransport: true,
    newline: 'unix',
    buffer: true,
  });
};

const emailTransporter = createEmailTransporter();

export const auth = betterAuth({
  // Database adapter
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Email/Password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true, // Require email verification before login
    autoSignInAfterVerification: true, // Auto sign-in after email verification
    sendResetPassword: async ({ user, url }) => {
      // Send password reset email
      await sendEmail({
        to: user.email,
        subject: 'Reset your password - AI Maturity Assessment',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Reset Your Password</h2>
            <p>Hi ${user.name || 'there'},</p>
            <p>You requested to reset your password. Click the button below to create a new password:</p>
            <div style="margin: 30px 0;">
              <a href="${url}"
                 style="background-color: #3b82f6; color: white; padding: 12px 24px;
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #666;">
              This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
            </p>
            <p style="color: #666; font-size: 14px; margin-top: 40px;">
              If the button doesn't work, copy and paste this link into your browser:<br/>
              <a href="${url}">${url}</a>
            </p>
          </div>
        `,
      });
    },
  },

  // Email verification
  emailVerification: {
    sendOnSignUp: true, // Send verification email after signup
    sendVerificationEmail: async ({ user, url, token }) => {
      // Send verification email
      await sendEmail({
        to: user.email,
        subject: 'Verify your email - AI Maturity Assessment',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to AI Maturity Assessment Platform!</h2>
            <p>Hi ${user.name || 'there'},</p>
            <p>Thank you for signing up! Please verify your email address to get started:</p>
            <div style="margin: 30px 0;">
              <a href="${url}"
                 style="background-color: #3b82f6; color: white; padding: 12px 24px;
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify Email
              </a>
            </div>
            <p style="color: #666;">
              Your verification code is: <strong>${token}</strong>
            </p>
            <p style="color: #666; font-size: 14px; margin-top: 40px;">
              If the button doesn't work, copy and paste this link into your browser:<br/>
              <a href="${url}">${url}</a>
            </p>
          </div>
        `,
      });
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache for 5 minutes
    },
  },

  // Security settings
  advanced: {
    generateId: () => {
      // Use cuid for consistency with Prisma
      return require('cuid').default();
    },
    crossSubDomainCookies: {
      enabled: false, // Set to true if using subdomains
    },
    useSecureCookies: process.env.NODE_ENV === 'production',
  },

  // Base URL
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // Secret for signing tokens
  secret: process.env.NEXTAUTH_SECRET || 'development-secret-change-in-production',

  // Trusted origins
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ],
});

/**
 * Helper function to send emails
 */
async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const info = await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      to,
      subject,
      html,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Email sent:', {
        to,
        subject,
        messageId: info.messageId,
      });

      // Log email content in development
      if (emailTransporter.transporter.name === 'StreamTransport') {
        const message = info.message.toString();
        console.log('Email content:', message);
      }
    }

    return info;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

/**
 * Export auth handlers for API routes
 */
export const {
  handler,
  signIn,
  signUp,
  signOut,
  sendVerificationEmail,
  verifyEmail,
  forgetPassword,
  resetPassword,
} = auth;

/**
 * Type-safe session helpers
 */
export type Session = typeof auth.$Infer.Session;
