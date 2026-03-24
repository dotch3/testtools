import { config } from '../config.js'

export interface PasswordPolicyOptions {
  minLength?: number
  requireUppercase?: boolean
  requireSymbol?: boolean
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

const UPPERCASE_RE = /[A-Z]/
const SYMBOL_RE = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/

export function validatePassword(password: string, options?: PasswordPolicyOptions): ValidationResult {
  const opts = {
    minLength: config.PASSWORD_MIN_LENGTH,
    requireUppercase: config.PASSWORD_REQUIRE_UPPERCASE,
    requireSymbol: config.PASSWORD_REQUIRE_SYMBOL,
    ...options,
  }

  const errors: string[] = []

  if (password.length < opts.minLength) {
    errors.push(`Password must be at least ${opts.minLength} characters`)
  }

  if (opts.requireUppercase && !UPPERCASE_RE.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (opts.requireSymbol && !SYMBOL_RE.test(password)) {
    errors.push('Password must contain at least one symbol')
  }

  return { valid: errors.length === 0, errors }
}
