// backend/src/infrastructure/mail/SmtpMailAdapter.ts
// SMTP mail adapter using Nodemailer. Only mail implementation in v1.
import nodemailer from 'nodemailer'
import type { IMailAdapter } from '../../domain/interfaces/IMailAdapter.js'
import type { Config } from '../../config.js'

export class SmtpMailAdapter implements IMailAdapter {
  private readonly transporter: nodemailer.Transporter
  private readonly from: string

  constructor(cfg: Config) {
    this.from = cfg.SMTP_FROM
    this.transporter = nodemailer.createTransport({
      host: cfg.SMTP_HOST,
      port: cfg.SMTP_PORT,
      secure: cfg.SMTP_SECURE,
      auth: cfg.SMTP_USER ? { user: cfg.SMTP_USER, pass: cfg.SMTP_PASS } : undefined,
    })
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Reset your TestTool password',
      html: `<p>Click the link below to reset your password. It expires in 1 hour.</p>
             <p><a href="${resetUrl}">${resetUrl}</a></p>`,
    })
  }

  async sendNotification(to: string, subject: string, body: string): Promise<void> {
    await this.transporter.sendMail({ from: this.from, to, subject, html: body })
  }
}
