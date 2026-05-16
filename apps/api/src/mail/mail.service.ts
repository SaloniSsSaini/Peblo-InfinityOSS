import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export type PasswordResetEmailParams = {
  to: string;
  resetUrl: string;
  name?: string | null;
};

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);

  onModuleInit() {
    if (process.env.NODE_ENV === 'production' && !this.isConfigured()) {
      this.logger.warn(
        'Mail is not configured (set RESEND_API_KEY or SMTP_HOST). Password reset emails will not be sent.',
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(process.env.RESEND_API_KEY?.trim() || process.env.SMTP_HOST?.trim());
  }

  async sendPasswordReset(params: PasswordResetEmailParams): Promise<void> {
    const from = this.mailFrom();
    const { subject, html, text } = this.passwordResetContent(params);

    if (process.env.RESEND_API_KEY?.trim()) {
      await this.sendViaResend({ from, to: params.to, subject, html, text });
      return;
    }

    if (process.env.SMTP_HOST?.trim()) {
      await this.sendViaSmtp({ from, to: params.to, subject, html, text });
      return;
    }

    throw new Error('Mail transport is not configured');
  }

  private mailFrom(): string {
    const from = process.env.MAIL_FROM?.trim();
    if (!from) {
      throw new Error('MAIL_FROM is required when sending email');
    }
    return from;
  }

  private passwordResetContent(params: PasswordResetEmailParams) {
    const greeting = params.name?.trim() ? `Hi ${params.name.trim()},` : 'Hi,';
    const subject = 'Reset your Peblo InfinityOS password';
    const text = `${greeting}

We received a request to reset your password. Open this link (valid for 1 hour):

${params.resetUrl}

If you did not request this, you can ignore this email.

— Peblo InfinityOS`;

    const html = `<!DOCTYPE html>
<html lang="en">
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;max-width:32rem;margin:0 auto;padding:1.5rem">
  <p>${this.escapeHtml(greeting)}</p>
  <p>We received a request to reset your password. Click the button below (link expires in 1 hour):</p>
  <p style="margin:1.5rem 0">
    <a href="${this.escapeHtml(params.resetUrl)}"
       style="display:inline-block;padding:0.75rem 1.25rem;background:linear-gradient(90deg,#7c3aed,#c026d3);color:#fff;text-decoration:none;border-radius:0.5rem;font-weight:600">
      Reset password
    </a>
  </p>
  <p style="font-size:0.875rem;color:#525252">Or copy this URL into your browser:<br>
    <a href="${this.escapeHtml(params.resetUrl)}">${this.escapeHtml(params.resetUrl)}</a>
  </p>
  <p style="font-size:0.875rem;color:#525252">If you did not request this, you can ignore this email.</p>
  <p style="font-size:0.875rem;color:#737373">— Peblo InfinityOS</p>
</body>
</html>`;

    return { subject, html, text };
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private async sendViaResend(message: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
  }) {
    const apiKey = process.env.RESEND_API_KEY!.trim();
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: message.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Resend API error ${res.status}: ${body.slice(0, 500)}`);
    }
  }

  private async sendViaSmtp(message: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
  }) {
    const host = process.env.SMTP_HOST!.trim();
    const port = Number(process.env.SMTP_PORT ?? '587');
    const secure =
      process.env.SMTP_SECURE === '1' ||
      process.env.SMTP_SECURE === 'true' ||
      port === 465;

    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();

    const transport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });

    await transport.sendMail({
      from: message.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}
