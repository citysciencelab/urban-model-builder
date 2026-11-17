#!/usr/bin/env node
// Configures a Keycloak realm so that MCP clients (the connectors of claude.ai and ChatGPT, Claude Code and
// others) can sign users in and call the backend's /mcp endpoint with OAuth.
//
// It is safe to run repeatedly. It does three things:
//   1. Creates the client scope `mcp`. A token with this scope gets the MCP endpoint as audience, which is
//      what the backend checks, and the user's email address, which the backend needs to create the user.
//   2. Makes the scope available to newly registered clients (optional realm default scope).
//   3. Lets MCP clients register themselves (dynamic client registration) if their redirect URIs are on one
//      of the trusted hosts, and lets them ask for the scope.
//
// Usage:
//   KEYCLOAK_URL=https://auth.example.org KEYCLOAK_REALM=hcu-model-builder \
//   KEYCLOAK_ADMIN=admin KEYCLOAK_ADMIN_PASSWORD=... \
//   MCP_PUBLIC_URL=https://api.example.org/mcp \
//   node scripts/keycloak-configure-mcp.mjs
//
// Optional: MCP_SCOPE (default "mcp"), MCP_TRUSTED_HOSTS (comma-separated hosts of redirect URIs; default
// below). `localhost` and `127.0.0.1` are needed for programs on the user's computer such as Claude Code.

const env = (name, fallback) => {
  const value = process.env[name] ?? fallback
  if (value === undefined) {
    console.error(`Missing environment variable ${name}`)
    process.exit(1)
  }
  return value
}

const keycloakUrl = env('KEYCLOAK_URL', 'http://localhost:8081').replace(/\/$/, '')
const realm = env('KEYCLOAK_REALM', 'hcu-model-builder')
const adminUser = env('KEYCLOAK_ADMIN')
const adminPassword = env('KEYCLOAK_ADMIN_PASSWORD')
const mcpUrl = env('MCP_PUBLIC_URL', 'http://localhost:3030/mcp')
const scopeName = env('MCP_SCOPE', 'mcp')
const trustedHosts = env('MCP_TRUSTED_HOSTS', 'claude.ai,claude.com,chatgpt.com,localhost,127.0.0.1')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean)

const POLICY_TYPE = 'org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy'
const adminBase = `${keycloakUrl}/admin/realms/${realm}`

async function request(method, url, { token, json, form } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {})
    },
    body: json ? JSON.stringify(json) : form ? new URLSearchParams(form).toString() : undefined
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${method} ${url} failed with ${response.status}: ${text.slice(0, 300)}`)
  }
  return text ? JSON.parse(text) : null
}

const { access_token: token } = await request(
  'POST',
  `${keycloakUrl}/realms/master/protocol/openid-connect/token`,
  { form: { grant_type: 'password', client_id: 'admin-cli', username: adminUser, password: adminPassword } }
)
const admin = (method, path, json) => request(method, `${adminBase}${path}`, { token, json })

// 1. The client scope with its two mappers
const mappers = [
  {
    name: 'mcp-audience',
    protocol: 'openid-connect',
    protocolMapper: 'oidc-audience-mapper',
    config: { 'included.custom.audience': mcpUrl, 'access.token.claim': 'true', 'id.token.claim': 'false' }
  },
  {
    name: 'email',
    protocol: 'openid-connect',
    protocolMapper: 'oidc-usermodel-attribute-mapper',
    config: {
      'user.attribute': 'email',
      'claim.name': 'email',
      'jsonType.label': 'String',
      'access.token.claim': 'true',
      'id.token.claim': 'true',
      'userinfo.token.claim': 'true'
    }
  }
]
const findScope = async () => (await admin('GET', '/client-scopes')).find((scope) => scope.name === scopeName)

let scope = await findScope()
if (!scope) {
  await admin('POST', '/client-scopes', {
    name: scopeName,
    protocol: 'openid-connect',
    description: 'Access to the Urban Model Builder for AI assistants (MCP)',
    attributes: {
      'include.in.token.scope': 'true',
      'display.on.consent.screen': 'true',
      'consent.screen.text': 'Read, edit and simulate your models in the Urban Model Builder'
    }
  })
  scope = await findScope()
  console.log(`Created the client scope "${scopeName}".`)
}
const existingMappers = await admin('GET', `/client-scopes/${scope.id}/protocol-mappers/models`)
for (const mapper of mappers) {
  const existing = existingMappers.find((other) => other.name === mapper.name)
  if (existing) {
    await admin('PUT', `/client-scopes/${scope.id}/protocol-mappers/models/${existing.id}`, {
      ...mapper,
      id: existing.id
    })
  } else {
    await admin('POST', `/client-scopes/${scope.id}/protocol-mappers/models`, mapper)
  }
}
console.log(`The scope "${scopeName}" adds the audience ${mcpUrl} and the email address to tokens.`)

// 2. Offer the scope to clients that are registered from now on
const optionalScopes = await admin('GET', '/default-optional-client-scopes')
if (!optionalScopes.some((optional) => optional.id === scope.id)) {
  await admin('PUT', `/default-optional-client-scopes/${scope.id}`)
}

// 3. Policies for clients that register themselves without authentication
const policies = (await admin('GET', `/components?type=${POLICY_TYPE}`)).filter(
  (policy) => policy.subType === 'anonymous'
)
const policy = (providerId) => {
  const found = policies.find((candidate) => candidate.providerId === providerId)
  if (!found) {
    throw new Error(`The realm has no anonymous client registration policy "${providerId}".`)
  }
  return found
}

const trusted = policy('trusted-hosts')
const allHosts = [...new Set([...(trusted.config['trusted-hosts'] ?? []), ...trustedHosts])]
trusted.config = {
  ...trusted.config,
  'trusted-hosts': allHosts,
  // The registration request comes from the servers of the client's vendor, not from a trusted host.
  // What is checked instead is that the redirect URIs of the client are on a trusted host.
  'host-sending-registration-request-must-match': ['false'],
  'client-uris-must-match': ['true']
}
await admin('PUT', `/components/${trusted.id}`, trusted)
console.log(`Clients may register with redirect URIs on: ${allHosts.join(', ')}.`)

const allowedScopes = policy('allowed-client-templates')
allowedScopes.config = {
  ...allowedScopes.config,
  'allowed-client-scopes': [...new Set([...(allowedScopes.config['allowed-client-scopes'] ?? []), scopeName])]
}
await admin('PUT', `/components/${allowedScopes.id}`, allowedScopes)

console.log('Done. Set MCP_OAUTH_ENABLED=true and MCP_PUBLIC_URL on the backend.')
