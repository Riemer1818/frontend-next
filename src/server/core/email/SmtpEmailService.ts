import nodemailer, { Transporter } from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean; // true for 465, false for other ports
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailOptions {
  from?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * SMTP-based email service for sending emails via nodemailer
 * Mirrors the structure of ImapEmailService for consistency
 */
export class SmtpEmailService {
  private config: SmtpConfig;
  private transporter: Transporter | null = null;

  constructor(config: SmtpConfig) {
    this.config = config;
  }

  /**
   * Create SMTP transporter
   */
  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.auth.user,
        pass: this.config.auth.pass,
      },
      // Additional options for better compatibility
      tls: {
        rejectUnauthorized: false,
      },
    });

    return this.transporter;
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
      return true;
    } catch (error: any) {
      console.error('❌ SMTP connection verification failed:', error.message);
      return false;
    }
  }

  /**
   * Send an email
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const transporter = this.getTransporter();

      // Prepare mail options
      const mailOptions: Mail.Options = {
        from: options.from || this.config.auth.user,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
      };

      // Add optional fields
      if (options.html) {
        mailOptions.html = options.html;
      }

      if (options.cc) {
        mailOptions.cc = Array.isArray(options.cc) ? options.cc.join(', ') : options.cc;
      }

      if (options.bcc) {
        mailOptions.bcc = Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc;
      }

      if (options.attachments && options.attachments.length > 0) {
        mailOptions.attachments = options.attachments.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.contentType,
        }));
      }

      // Send email
      const info = await transporter.sendMail(mailOptions);

      console.log('✅ Email sent successfully:', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      console.error('❌ Failed to send email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }
  }

  /**
   * Close the transporter connection
   */
  async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      console.log('📪 SMTP connection closed');
    }
  }
}

/**
 * Create SMTP service from environment variables
 */
export function createSmtpServiceFromEnv(): SmtpEmailService {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true';

  if (!host || !port || !user || !pass) {
    throw new Error(
      'Missing SMTP configuration. Required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS'
    );
  }

  return new SmtpEmailService({
    host,
    port: parseInt(port),
    secure,
    auth: {
      user,
      pass,
    },
  });
}
