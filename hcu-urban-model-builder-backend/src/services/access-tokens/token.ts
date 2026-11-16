import { createHash, randomBytes } from 'node:crypto'
import type { Application } from '../../declarations.js'
import type { User } from '../users/users.js'

/** Makes tokens recognisable, for users and for secret scanners. */
export const ACCESS_TOKEN_PREFIX = 'umb_pat_'

const LAST_USED_RESOLUTION_MS = 60_000

export function generateAccessToken() {
  const token = ACCESS_TOKEN_PREFIX + randomBytes(32).toString('base64url')
  return {
    token,
    tokenHash: hashAccessToken(token),
    tokenPrefix: token.slice(0, ACCESS_TOKEN_PREFIX.length + 6)
  }
}

/**
 * A token is 256 random bits, so a plain SHA-256 is sufficient: there is nothing to guess, and the hash can be
 * looked up by index, which a salted password hash could not.
 */
export function hashAccessToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

/** Returns the user a valid, unexpired token belongs to, otherwise null. */
export async function resolveAccessToken(app: Application, token: string): Promise<User | null> {
  if (!token.startsWith(ACCESS_TOKEN_PREFIX)) {
    return null
  }
  const knex = app.get('postgresqlClient')
  const record = await knex('access_tokens')
    .where({ tokenHash: hashAccessToken(token) })
    .first()
  if (!record || new Date(record.expiresAt).getTime() <= Date.now()) {
    return null
  }

  // informational only, so one write per minute is enough
  const lastUsedAt = record.lastUsedAt ? new Date(record.lastUsedAt).getTime() : 0
  if (Date.now() - lastUsedAt > LAST_USED_RESOLUTION_MS) {
    await knex('access_tokens').where({ id: record.id }).update({ lastUsedAt: new Date() })
  }

  try {
    return await app.service('users').get(record.userId)
  } catch {
    return null
  }
}
