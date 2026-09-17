import nodemailer from "nodemailer";
import type { Transporter } from 'nodemailer';

interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export class EmailService {
  private static transporter: Transporter | null = null;

  private static getTransporter(): Transporter {
    if(!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('Unable to fetch environment variable.');
    }

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    return this.transporter;
  }

  static async sendMail(options: SendMailOptions): Promise<boolean> {
    const transporter = this.getTransporter();

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.info('Mail send to email.', {
      to: options.to,
      subject: options.subject,
      text: options.text,
    });

    return true;
  }

  static async sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
    return this.sendMail({
      to: email,
      subject: 'OmniServe - Password Reset Request',
      text: `You requested a password reset. Click the link to reset your password: ${resetLink}\nThis link will expire in 15 minutes.`,
      html: `
        <p>You requested a password reset for your OmniServe account.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetLink}">Reset Password</a></p>
        <p>This link will expire in 15 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });
  }
}
