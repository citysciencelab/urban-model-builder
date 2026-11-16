# MCP integration plan

Status: phase 1 implemented, phases 2–6 open.

## Goal

Let language models read, build, edit and simulate models in the Urban Model Builder through two entry points:

1. **External clients** (Claude, ChatGPT, other MCP clients) connect to an MCP endpoint of the backend.
2. **In-app chat**: a chat panel in the model editor that talks to a model via OpenRouter, using the user's own API key.

## Decisions

| Question | Decision |
|---|---|
| Where does the chat live? | In the Model Builder (side panel next to the canvas). |
| Authentication of external clients | Personal access tokens first, OAuth 2.1 via Keycloak later. |
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

### Phase 2: MCP endpoint with personal access tokens

- Migration and service `access-tokens`: only the hash is stored, the token is shown once, it can be revoked and has
  an expiry date.
- `/mcp` mounted on Koa via `@modelcontextprotocol/sdk` (Streamable HTTP, stateless). The bearer token resolves to a
  user, which is passed to the tool layer.
- Client: settings page to create and revoke tokens, with a copyable configuration snippet.

### Phase 3: chat backend

- Migration and service `llm-settings`: OpenRouter key encrypted with AES-256-GCM using a server secret from the
  environment. Write-only: the API never returns the key, only whether one is set.
- Service `chat`: agent loop against OpenRouter's chat completions API with the tool registry. Text deltas and tool
  events stream to the requesting connection only; iteration cap per turn.
- Automatic `cloneVersion` checkpoint before the first write of a chat session, as a substitute for undo.

### Phase 4: chat panel in the Ember app

- Side panel in the model editor bound to the current model version, model selection from an allowlist, visible log
  of tool calls.
- Key entry in the user settings with a consent note that content goes to OpenRouter and its providers.
- Translations and an update of the `datenschutz` page.

### Phase 5: OAuth for claude.ai and ChatGPT

- Spike first: Keycloak version, audience binding and client registration, checked against the current MCP
  authorization specification and the requirements of both connectors.
- Then protected-resource metadata and token validation on `/mcp`, in parallel to the tokens of phase 2.

### Phase 6: hardening

- Configurable host allowlist or egress restriction for the OGC API Features node.
- Rate limits per user, simulation through the BullMQ queue, audit log of tool calls.

## Risks

- **Server-side requests and prompt injection**: the OGC API Features node fetches URLs during simulation. Until
  phase 6 the tool layer does not let a language model create or edit such nodes, and `simulate` refuses models whose
  OGC nodes point to hosts other than the default endpoint.
- **No undo**: an agent can damage a draft. Phase 3 adds an automatic checkpoint; until then callers should use
  `clone_model_version` before larger changes.
- **Data protection**: OpenRouter routes content to third-party providers. Consent and the privacy page are part of
  phase 4.
- **Synchronous simulation**: `models.simulate` runs inside the request; phase 6 moves it to the queue.

## Open points

- **Chat history**: kept in the browser session only. Server-side persistence would add a table and a retention
  question.
- **Key encryption secret**: rotating it invalidates all stored keys unless a re-encryption step is built.
- **Demo route**: no chat there, since the loop runs in the backend and the demo has neither a user nor a key.

## Relation to the Urban Model Platform

The platform already exposes approved, published models as MCP tools via OGC API Processes. The Model Builder's tools
therefore focus on authoring and on simulating drafts, not on duplicating execution.
