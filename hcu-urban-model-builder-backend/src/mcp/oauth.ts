import type { Middleware } from 'koa'
import VerifierModule from 'feathers-authentication-oidc/lib/Verifier.js'
import type { Application } from '../declarations.js'
import type { User } from '../services/users/users.js'

// The library is CommonJS: under Node's ESM loader the class is the `default` property of the module object
type VerifierClass = typeof VerifierModule.default
const Verifier: VerifierClass = (VerifierModule as any).default ?? VerifierModule

/**
 * OAuth 2.1 for the MCP endpoint, as the MCP authorization specification requires it for clients that cannot
 * be given a personal access token (the connectors of claude.ai and ChatGPT).
 *
 * The backend is only the resource server. Keycloak, which already signs users in to the app, is the
 * authorization server: MCP clients find it through the protected resource metadata served here (RFC 9728),
 * register themselves there and send the access tokens they get to `/mcp`.
 *
 * A token is accepted only if Keycloak issued it for this endpoint: its audience has to be the MCP endpoint.
 * Keycloak adds that audience with the client scope configured as `mcp.oauth.scope` (see
 * scripts/keycloak-configure-mcp.mjs). Tokens of the web app do not have it, so they cannot be replayed here.
 */

export const PROTECTED_RESOURCE_METADATA_PATH = '/.well-known/oauth-protected-resource'

export function getOAuthSettings(app: Application) {
  const { publicUrl, oauth } = app.get('mcp')
  if (!oauth.enabled) {
    return null
  }
  const issuer = (app.get('authentication') as any)?.oidc?.issuer as string
  return {
    issuer,
    scope: oauth.scope,
    /** The identifier of the MCP endpoint as a protected resource, and the audience tokens must have. */
    resource: publicUrl,
    metadataUrl: `${new URL(publicUrl).origin}${PROTECTED_RESOURCE_METADATA_PATH}${new URL(publicUrl).pathname}`
  }
}

/** Value of the WWW-Authenticate header that tells a client where and how to get a token. */
export function getChallenge(app: Application, error?: 'invalid_token' | 'insufficient_scope') {
  const settings = getOAuthSettings(app)
  const parts = ['realm="Urban Model Builder"']
  if (settings) {
    parts.push(`resource_metadata="${settings.metadataUrl}"`, `scope="${settings.scope}"`)
  }
  if (error) {
    parts.push(`error="${error}"`)
  }
  return `Bearer ${parts.join(', ')}`
}

/**
 * Serves the protected resource metadata, at the well-known path with and without the path of the MCP
 * endpoint appended, because clients look for either.
 */
export function protectedResourceMetadataMiddleware(app: Application): Middleware {
  return async (ctx, next) => {
    if (!ctx.path.startsWith(PROTECTED_RESOURCE_METADATA_PATH) || ctx.method !== 'GET') {
      return next()
    }
    const settings = getOAuthSettings(app)
    const suffix = ctx.path.slice(PROTECTED_RESOURCE_METADATA_PATH.length)
    if (!settings || (suffix !== '' && suffix !== new URL(settings.resource).pathname)) {
      return next()
    }
    ctx.body = {
      resource: settings.resource,
      authorization_servers: [settings.issuer],
      scopes_supported: [settings.scope],
      bearer_methods_supported: ['header'],
      resource_name: 'Urban Model Builder'
    }
  }
}

export class OAuthTokenError extends Error {
  constructor(
    public reason: 'invalid_token' | 'insufficient_scope',
    message: string
  ) {
    super(message)
  }
}

// One verifier per issuer and audience; it caches the signing keys of the issuer
const verifiers = new Map<string, InstanceType<VerifierClass>>()

/**
 * Verifies an access token of the authorization server and returns the user it was issued for. The user is
 * created if they have never signed in to the app, as the web app's login does.
 */
export async function resolveOAuthToken(app: Application, token: string): Promise<User> {
  const settings = getOAuthSettings(app)
  if (!settings) {
    throw new OAuthTokenError('invalid_token', 'OAuth is not enabled.')
  }

  const key = `${settings.issuer} ${settings.resource}`
  let verifier = verifiers.get(key)
  if (!verifier) {
    verifier = new Verifier({ issuer: settings.issuer, audience: settings.resource, algorithms: ['RS256'] })
    verifiers.set(key, verifier)
  }

  let claims: { sub?: string; scope?: string; email?: string }
  try {
    // checks signature, expiry, issuer and audience
    claims = await verifier.verifyJwt(token)
  } catch (error: any) {
    throw new OAuthTokenError('invalid_token', error.message)
  }
  if (!claims.sub) {
    throw new OAuthTokenError('invalid_token', 'The token has no subject.')
  }
  if (!(claims.scope ?? '').split(' ').includes(settings.scope)) {
    throw new OAuthTokenError('insufficient_scope', `The token lacks the scope "${settings.scope}".`)
  }

  const users = app.service('users')
  const existing = await users.find({ query: { oidcId: claims.sub, $limit: 1 } })
  if (existing.data[0]) {
    return existing.data[0]
  }
  if (!claims.email) {
    // A user record needs an email address. The scope is expected to put it into the token; without it only
    // users who have signed in to the app before can be recognised.
    throw new OAuthTokenError('invalid_token', 'The token has no email address and the user is unknown.')
  }
  return users.create({ oidcId: claims.sub, email: claims.email })
}
