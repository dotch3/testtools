import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16

function getKey(key: string): Buffer {
  if (!/^[a-f0-9]{64}$/i.test(key)) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }
  return Buffer.from(key, 'hex')
}

export function encrypt(plaintext: string, keyHex: string): string {
  const key = getKey(keyHex)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex')
  ciphertext += cipher.final('hex')

  const tag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${ciphertext}:${tag.toString('hex')}`
}

export function decrypt(encrypted: string, keyHex: string): string {
  const key = getKey(keyHex)
  const parts = encrypted.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted value format')

  const [ivHex, ciphertext, tagHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const ciphertextBuffer = Buffer.from(ciphertext, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(ciphertextBuffer)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString('utf8')
}
