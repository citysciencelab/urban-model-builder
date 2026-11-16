import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import type { Application } from '../declarations.js'

const VERSION = 'v1'
const keyCache = new Map<string, Buffer>()

function getKey(app: Application) {
  const secret = app.get('llm').encryptionSecret
  if (!secret) {
    return null
  }
  let key = keyCache.get(secret)
  if (!key) {
    // the salt only separates this use of the secret from others, it does not need to be secret
    key = scryptSync(secret, 'umb-llm-settings', 32)
    keyCache.set(secret, key)
  }
  return key
}

/** Whether the server is configured to store secrets of users. */
export const canStoreSecrets = (app: Application) => getKey(app) !== null

/** Encrypts a secret of a user for storage (AES-256-GCM, authenticated). */
export function encryptSecret(app: Application, plaintext: string) {
  const key = getKey(app)
  if (!key) {
    throw new Error('llm.encryptionSecret is not configured')
  }
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return [VERSION, iv, cipher.getAuthTag(), ciphertext]
    .map((part) => (typeof part === 'string' ? part : part.toString('base64')))
    .join(':')
}

/** Returns the secret, or null if it cannot be decrypted, e.g. after the encryption secret was changed. */
export function decryptSecret(app: Application, stored: string) {
  const key = getKey(app)
  const [version, iv, authTag, ciphertext] = stored.split(':')
  if (!key || version !== VERSION || !iv || !authTag || !ciphertext) {
    return null
  }
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'))
    decipher.setAuthTag(Buffer.from(authTag, 'base64'))
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString(
      'utf8'
    )
  } catch {
    return null
  }
}
