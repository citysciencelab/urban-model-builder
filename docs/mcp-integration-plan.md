# MCP integration plan

Status: all phases implemented, including geodata for the tools (option 2, together with phase 6). The client follows the UMB Design System (branch
`feature/umb-design-system`, merged into this branch).

## Goal

Let language models read, build, edit and simulate models in the Urban Model Builder through two entry points:

1. **External clients** (Claude, ChatGPT, other MCP clients) connect to an MCP endpoint of the backend.
2. **In-app chat**: a chat panel in the model editor that talks to a model via OpenRouter, using the user's own API key.

## Decisions

| Question | Decision |
|---|---|
| Where does the chat live? | In the Model Builder (side panel next to the canvas). |
| Authentication of external clients | Personal access tokens, and OAuth 2.1 via Keycloak (phase 5). |
| Where does the chat's agent loop run? | In the backend, calling the tool layer in-process. |
| Where does the OpenRouter key live? | Per user, encrypted in the database. |

## Architecture

```
Claude Code / Desktop ──PAT──► /mcp ───────────────┐
claude.ai / ChatGPT ──OAuth (phase 5)──► /mcp ─────┤
                                                   ├─► src/model-tools ─► Feathers services
Ember chat panel ─Socket.IO─► chat service ────────┘
                                   │
                                   └─► OpenRouter (user's own key)
```

Both entry points call the same tool registry (`hcu-urban-model-builder-backend/src/model-tools/`). The tool layer is
server-only, so tool changes do not require a new client bundle.

Properties the tool layer relies on:

- **Permissions**: reads go through the services as external calls with the acting user, so the existing permission
  filters apply. Writes check the user's role and the version state once per call (collaborator or higher, draft, latest).
- **Real-time**: service events reach the `model-versions:<id>` channel, so edits by a language model appear live on
  the canvas of every connected user.
- **Schemas**: tool inputs are TypeBox schemas, i.e. JSON Schema, which both MCP and OpenRouter tool calls expect.

## Phases

### Phase 1: tool layer (implemented)

- Tool registry with input validation and uniform errors (`callTool`, `listTools`).
- Tools: `list_models`, `get_model`, `get_model_version`, `get_modeling_reference`, `create_model`,
  `update_simulation_settings`, `apply_graph_patch`, `auto_layout`, `validate_model`, `simulate`, `new_draft`,
  `clone_model_version`.
- `apply_graph_patch` validates the whole batch first, writes in one database transaction and emits the real-time
  events only after the commit.
- Server-side layout (dagre) and automatic choice of edge handles, so the model does not have to produce coordinates.
- Compact graph serialisation and downsampled simulation results.
- Mocha tests against the test database, including permission tests.

Deliberately left out of phase 1:

- Publishing versions: needs a human confirmation step that belongs to the front ends (phases 2 and 4).
- Scenario tools (`set_scenario_values`): parameters get their default scenario value, further scenarios follow later.
- Creating or editing OGC API Features nodes, and simulating models whose OGC nodes point to hosts outside the
  allowlist: see "Risks".

### Phase 2: MCP endpoint with personal access tokens (implemented)

- Migration and service `access-tokens` (`find`, `create`, `remove`): only the SHA-256 hash of a token is stored, the
  token is shown once on creation, it can be revoked, and it expires after 90 days by default (at most 365). Tokens
  can only be managed in a session signed in through Keycloak, not with a token.
- `/mcp` on the backend (`src/mcp/mcp.ts`), a Koa middleware using `@modelcontextprotocol/sdk` (Streamable HTTP,
  stateless, JSON responses). The bearer token resolves to a user, who is passed to the tool layer. Tool errors are
  returned as tool results, so the model can read and correct them.
- Client: page "AI access" (`/authenticated/access-tokens`, reached from the account menu of the app rail) to
  create and revoke tokens, with copyable configuration for Claude Code and for programs that use an `mcpServers`
  configuration file.

Connecting, for example with Claude Code:

```
claude mcp add --transport http urban-model-builder https://<backend>/mcp --header "Authorization: Bearer <token>"
```

Deployment: run the migration, and make sure a reverse proxy in front of the backend forwards `/mcp` and the
`Authorization` header.

### Phase 3: chat backend (implemented)

- Service `llm-settings` (`get('me')`, `patch('me')`) with migration: the user's OpenRouter API key and preferred
  model. The key is write-only: stored encrypted with AES-256-GCM (`src/llm/secret-box.ts`), never returned, and
  decrypted only on the server for a chat request. The settings also tell the client which models are available.
- Service `chat` (`create`): one call is one turn. The client sends the conversation so far (the server keeps no
  history), the server runs the agent loop (`src/llm/agent.ts`) against OpenRouter's streaming chat completions API
  (`src/llm/openrouter.ts`) with the tool registry, and produces the final answer with the tool calls and token usage.
- Over a real-time connection `create` returns at once (`status: 'started'`), because the client's socket gives up
  on a request after 10 seconds. `progress` events (`text_delta`, `tool_call`, `tool_result`, and finally `done`
  with the answer or `error`) go to the calling connection only. REST and internal callers get the answer as the
  result of `create`.
- With `createCheckpoint`, the model version is copied into a new model of the user before the first change of a
  turn; the response names the copy. The client decides when to ask for it (once per chat session).
- Limits: one running turn per user, a configurable number of model calls per turn, five minutes per turn, tool
  results capped in size. Errors of the provider reach the client with a reason (`missing_api_key`,
  `invalid_api_key`, `insufficient_credits`, `rate_limited`, `llm_error`).

Configuration (`config/default.json`, section `llm`; environment variables in brackets):

- `encryptionSecret` (`LLM_ENCRYPTION_SECRET`): required for the chat, at least 16 characters, no default. Without
  it keys cannot be stored and `chatAvailable` is false. Changing it makes stored keys unreadable; users then have
  to enter their key again.
- `models` (`LLM_MODELS`, JSON array) and `defaultModel` (`LLM_DEFAULT_MODEL`): OpenRouter model ids users may
  choose from. The defaults in the repository were not checked against OpenRouter's current catalogue.
- `openRouterBaseUrl` (`OPENROUTER_BASE_URL`), `maxIterations`.

### Phase 4: chat panel in the Ember app (implemented)

- Sidebar view "Assistant" in the editor (`app/components/sidebar-general/views/assistant.*`, robot icon in the
  sidebar's navigation), styled with the UMB Design System (`app/styles/design-system/_assistant.scss`). It shows
  the conversation, the tools the assistant uses while a turn runs, and the answer as plain text.
- Service `assistant` (`app/services/assistant.ts`): settings and one conversation per model version, kept in
  memory for the lifetime of the browser tab. It asks the backend for a backup copy once per conversation, before
  the first change, and shows a link to the copy.
- First use: the view asks for the OpenRouter API key and for consent to send messages and model content to
  OpenRouter and the model provider. The consent is remembered in the browser (`localStorage`). The settings of the
  view allow choosing a model from the server's list and replacing or removing the key.
- Privacy page (`datenschutz`): new section on the assistant and on access by programs with access tokens. The text
  is a draft and needs a legal review.
- Feathers client bundle 1.0.0-17 with the `chat` and `llm-settings` services.

Not part of this phase: rendering Markdown in answers (the assistant is told to write plain text), stopping a
running turn, and the assistant in the demo route.

### Phase 5: OAuth for claude.ai and ChatGPT (implemented)

The backend is an OAuth resource server for `/mcp`; Keycloak, which already signs users in, is the authorization
server. An MCP client discovers Keycloak through the backend, registers itself there, sends the user through
Keycloak's login and consent screen, and calls `/mcp` with the access token it gets. Personal access tokens keep
working alongside.

Backend (`src/mcp/oauth.ts`), off unless `mcp.oauth.enabled` is set:

- Protected resource metadata (RFC 9728) at `/.well-known/oauth-protected-resource` and
  `/.well-known/oauth-protected-resource/mcp`, naming the OIDC issuer as authorization server and `mcp` as scope.
- `401` responses of `/mcp` carry `WWW-Authenticate: Bearer resource_metadata="…", scope="mcp"`.
- A token is accepted only if it is signed by the issuer, not expired, has the MCP endpoint (`mcp.publicUrl`) as
  audience and carries the scope. Tokens of the web app have another audience and are rejected. The user is looked
  up by the token's subject and created on first use, as the web app's login does.

Keycloak (`scripts/keycloak-configure-mcp.mjs`, safe to run repeatedly):

- Client scope `mcp` with an audience mapper (adds the MCP endpoint as audience) and an email mapper, offered to
  newly registered clients as an optional scope.
- Anonymous dynamic client registration for clients whose redirect URIs are on a trusted host (default:
  `claude.ai`, `claude.com`, `chatgpt.com`, `localhost`, `127.0.0.1`), and permission to ask for the scope.
  Keycloak shows such clients' users a consent screen.

Client: the "AI access" page asks the server for the metadata and, if OAuth is on, explains connecting by signing
in and shows the endpoint URL the server announces.

Results of the spike (Keycloak 25.0.4 with the realm of this repository, run locally):

- No upgrade is needed. Keycloak 25 publishes authorization server metadata, supports PKCE (S256), public clients
  and dynamic client registration.
- Keycloak ignores the `resource` parameter (RFC 8707). Audience binding therefore goes through the scope: only a
  token requested with the scope `mcp` gets the audience. Clients learn the scope from the metadata and the
  `WWW-Authenticate` header.
- Out of the box, anonymous registration is rejected by the "Trusted Hosts" policy, and a client asking for the
  scope `mcp` by the "Allowed Client Scopes" policy. The script changes both.
- Keycloak serves its metadata only below the realm path (`/realms/<realm>/.well-known/…`), not at the
  path-inserted location of RFC 8414. The client of the official MCP SDK (1.32) tries the standard locations
  first and then finds it; a client that only tries the RFC 8414 location would fail.
- Verified end to end: the SDK's client, given only the `/mcp` URL, discovered Keycloak, registered, went through
  login and consent (played by a script), and listed and called the tools.

Deployment:

1. Run the script against the production Keycloak with `MCP_PUBLIC_URL` set to the public URL of `/mcp`.
2. Set `MCP_PUBLIC_URL` and `MCP_OAUTH_ENABLED=true` on the backend. The URL has to be exactly the one of step 1,
   because it is the audience.
3. Make sure the reverse proxy forwards `/mcp` and `/.well-known/oauth-protected-resource` (with anything after
   it) to the backend, including the `Authorization` header.

Not verified, because it needs the deployed system: a connection from claude.ai and from ChatGPT themselves. The
trusted hosts are the redirect hosts of these services as far as known; if a registration is rejected, Keycloak's
error names the host to add to `MCP_TRUSTED_HOSTS`.

Open points:

- Every connection of a user registers a new client in Keycloak, and the realm's "Max Clients Limit" policy stops
  anonymous registration at 200 clients. Unused clients have to be removed, or the limit raised.
- Access is all or nothing: the scope `mcp` gives a client all tools with the user's permissions.

### Phase 6: hardening, and geodata for the tools (implemented)

Geodata (OGC API Features), `src/model-tools/ogc.ts`:

- Three read-only tools to find data: `list_ogc_datasets` (endpoints of the model version and their datasets,
  with search), `list_ogc_collections` and `describe_ogc_collection` (properties, feature count, a few sample
  features).
- `apply_graph_patch` creates and changes `ogc-api-features` nodes: endpoint, dataset, collection, query and
  data transform. The node gets the endpoint copied in and the editor's query defaults (limit 1000).
- The server only talks to endpoints that are configured on the model version *and* whose host is on the
  allowlist `ogc.allowedHosts` (`OGC_ALLOWED_HOSTS`, JSON array; default `["api.hamburg.de"]`). A tool cannot set a
  URL of its own. Redirects are not followed, requests time out after 20 seconds. `simulate` refuses models with
  OGC nodes outside the allowlist, also nodes made in the editor.
- Feature content reaches the language model. The tool descriptions tell it to treat that content as data;
  this reduces, but does not remove, the risk of instructions hidden in a data source. The allowlist is the
  actual safeguard: only sources the operators trust are used.

Limits (`limits` in the configuration):

- Rate limits per user in Redis, valid across server processes: tool calls per minute (default 120),
  simulations per minute (20), chat messages per hour (60). If Redis is unreachable, the limits are suspended
  and the log says so, rather than making the tools unusable.
- Simulations started by tools run in worker threads (`simulation-runner.ts`, `simulation-worker.ts`): at most
  `maxConcurrentSimulations` at a time (2), further ones wait (up to 20), and one that runs longer than
  `simulationTimeoutSeconds` (30) is terminated. The server stays responsive meanwhile. This replaces the BullMQ
  queue planned originally: the tools need the result within the same call, and a queue would only have moved
  the blocking computation into another process of the same server without a time limit.

Log of tool calls (`tool_calls` table, `src/model-tools/audit-log.ts`):

- Per call: user, front end (`mcp`, `chat`, `internal`), tool, model or version it concerned, success or error
  code, duration. No arguments or results, because they contain model content.
- Entries older than `auditLogRetentionDays` (90) are deleted. There is no interface to read the log yet; it is
  meant for operators (SQL).

## Risks

- **Server-side requests and prompt injection**: OGC nodes make the server request external services, and
  feature content reaches the language model. Both are limited to the hosts on `ogc.allowedHosts`.
- **No undo**: an agent can damage a draft. Phase 3 adds an automatic checkpoint; until then callers should use
  `clone_model_version` before larger changes.
- **Data protection**: OpenRouter routes content to third-party providers. Consent and the privacy page are part of
  phase 4.
- **Simulation load**: simulations of the tools run in worker threads with a time limit; simulations started in
  the editor run in the browser and the UMP's via BullMQ, as before.

## Open points

- **Chat history**: kept in the browser session only. Server-side persistence would add a table and a retention
  question.
- **Key encryption secret**: rotating it invalidates all stored keys unless a re-encryption step is built.
- **Demo route**: no chat there, since the loop runs in the backend and the demo has neither a user nor a key.

## Relation to the Urban Model Platform

The platform already exposes approved, published models as MCP tools via OGC API Processes. The Model Builder's tools
therefore focus on authoring and on simulating drafts, not on duplicating execution.
