import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Single shared SMTP transport for the whole app. If SMTP_HOST isn't
// set, this falls back to logging what WOULD be sent instead of
// throwing — the same dev-friendly behavior the original stub mailers
// had, except now it's a fallback rather than the only mode. Set the
// SMTP_* env vars below to send real email.
@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromAddress = process.env.MAIL_FROM ?? '"System" <no-reply@example.com>';

  onModuleInit() {
    if (!process.env.SMTP_HOST) {
      this.logger.warn(
        'SMTP_HOST is not set — emails will be logged instead of sent. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD/MAIL_FROM to send real email.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587/STARTTLS
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
  }

  async send({ to, subject, html, text }: SendMailInput): Promise<void> {
    if (!this.transporter) {
      this.logger.log('--- [stub email — SMTP not configured] ---');
      this.logger.log(`To: ${to}`);
      this.logger.log(`Subject: ${subject}`);
      this.logger.log(text ?? html.replace(/<[^>]+>/g, ' '));
      this.logger.log('-------------------------------------------');
      return;
    }

    try {
      await this.transporter.sendMail({ from: this.fromAddress, to, subject, html, text });
    } catch (err) {
      // Never let an email failure break the calling operation (a
      // request being created, a payslip being finalized, etc.) —
      // callers already treat these as best-effort and just log.
      this.logger.error(`Failed to send email to ${to}: ${(err as Error).message}`);
      throw err; // still surfaced to the caller's .catch() for its own logging/telemetry
    }
  }
}
