import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '../../src/utils/crypto'

describe('crypto', () => {
  const key = 'a'.repeat(64)
  const plaintext = 'super-secret-oauth-token'

  it('encrypts and decrypts successfully', () => {
    const encrypted = encrypt(plaintext, key)
    expect(encrypted).not.toBe(plaintext)
    expect(encrypted).toMatch(/^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/)

    const decrypted = decrypt(encrypted, key)
    expect(decrypted).toBe(plaintext)
  })

  it('throws on invalid key length', () => {
    expect(() => encrypt('text', 'short')).toThrow('ENCRYPTION_KEY must be 64 hex characters')
  })

  it('throws on tampered ciphertext', () => {
    const encrypted = encrypt(plaintext, key)
    const parts = encrypted.split(':')
    const tampered = `${parts[0]}:${parts[1].slice(0, -2)}ab:${parts[2]}`
    expect(() => decrypt(tampered, key)).toThrow()
  })

  it('produces different ciphertexts for same plaintext (random IV)', () => {
    const e1 = encrypt(plaintext, key)
    const e2 = encrypt(plaintext, key)
    expect(e1).not.toBe(e2)
  })
})
