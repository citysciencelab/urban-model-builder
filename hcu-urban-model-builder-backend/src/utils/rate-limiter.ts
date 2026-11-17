import { Redis } from 'ioredis'
import type { Application } from '../declarations.js'
import { logger } from '../logger.js'

/**
 * Counts what a user does per time window, in Redis, so that the limit holds across all server processes.
 *
 * The limiter protects the server, it does not protect data. If Redis cannot be reached it therefore lets
 * requests through (and says so in the log) instead of making the tools unusable.
 */

const RETRY_AFTER_FAILURE_MS = 30_000

let redis: Redis | null = null
let unavailableUntil = 0

function getRedis(app: Application) {
  if (!redis) {
    const { host, port } = (app.get as any)('redis')
    redis = new Redis({ host, port, maxRetriesPerRequest: 1, commandTimeout: 1000 })
    // failures are handled per command; without a listener ioredis prints every reconnect attempt
    redis.on('error', () => {})
  }
  return redis
}

/**
 * Registers one use of `name` by the user. Returns whether it is within the limit and, if not, after how
 * many seconds the next attempt can succeed.
 */
export async function consumeRateLimit(
  app: Application,
  name: string,
  userId: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = Date.now()
  if (now < unavailableUntil) {
    return { allowed: true, retryAfterSeconds: 0 }
  }
  const nowSeconds = Math.floor(now / 1000)
  const window = Math.floor(nowSeconds / windowSeconds)
  const key = `umb:rate:${name}:${userId}:${window}`

  try {
    const client = getRedis(app)
    const count = await client.incr(key)
    if (count === 1) {
      await client.expire(key, windowSeconds * 2)
    }
    return { allowed: count <= limit, retryAfterSeconds: windowSeconds - (nowSeconds % windowSeconds) }
  } catch (error: any) {
    unavailableUntil = now + RETRY_AFTER_FAILURE_MS
    logger.error(`Rate limiting is off because Redis cannot be reached: ${error?.message}`)
    return { allowed: true, retryAfterSeconds: 0 }
  }
}
