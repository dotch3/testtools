// backend/src/infrastructure/mail/mailFactory.ts
// Returns the configured mail adapter. Only SMTP is supported in v1.
import type { IMailAdapter } from '../../domain/interfaces/IMailAdapter.js'
import { SmtpMailAdapter } from './SmtpMailAdapter.js'
import { config } from '../../config.js'

export function createMailAdapter(): IMailAdapter {
  if (!config.SMTP_HOST) {
    throw new Error('SMTP_HOST is required. Configure SMTP settings in .env to enable email features.')
  }
  return new SmtpMailAdapter(config)
}

// Lazy singleton — only instantiated when first accessed.
// Returns null if SMTP is not configured, allowing the server to start without email.
// Callers that require email (AuthService.forgotPassword) must check for null.
let _mailAdapter: IMailAdapter | null = null

export function getMailAdapter(): IMailAdapter | null {
  if (!_mailAdapter) {
    try {
      _mailAdapter = createMailAdapter()
    } catch {
      return null
    }
  }
  return _mailAdapter
}
