// backend/src/domain/interfaces/IMailAdapter.ts
// Abstraction over email delivery.
// Only SMTP (Nodemailer) is implemented in v1.

export interface IMailAdapter {
  /**
   * Sends a password reset email containing the reset URL.
   */
  sendPasswordReset(to: string, resetUrl: string): Promise<void>

  /**
   * Sends a generic notification email.
   */
  sendNotification(to: string, subject: string, body: string): Promise<void>

  /**
   * Sends a welcome email to newly registered users.
   */
  sendWelcome(to: string, name?: string): Promise<void>
}
