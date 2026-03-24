import { describe, it, expect } from 'vitest'
import { validatePassword } from '../../src/utils/passwordPolicy'

describe('passwordPolicy', () => {
  const defaults = {
    minLength: 8,
    requireUppercase: true,
    requireSymbol: true,
  }

  it('accepts a password meeting all requirements', () => {
    expect(validatePassword('SecurePass123!', defaults)).toEqual({ valid: true, errors: [] })
  })

  it('rejects password shorter than minLength', () => {
    const result = validatePassword('Ab1!', { ...defaults, minLength: 8 })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must be at least 8 characters')
  })

  it('rejects password without uppercase when required', () => {
    const result = validatePassword('securepass123!', defaults)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one uppercase letter')
  })

  it('rejects password without symbol when required', () => {
    const result = validatePassword('SecurePass1234', defaults)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one symbol')
  })

  it('accepts password without uppercase when not required', () => {
    expect(validatePassword('securepass123!', { ...defaults, requireUppercase: false })).toEqual({ valid: true, errors: [] })
  })

  it('accepts password without symbol when not required', () => {
    expect(validatePassword('SecurePass1234', { ...defaults, requireSymbol: false })).toEqual({ valid: true, errors: [] })
  })

  it('returns multiple errors when multiple rules fail', () => {
    const result = validatePassword('short', defaults)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })
})
