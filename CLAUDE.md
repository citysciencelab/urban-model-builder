# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Monorepo with two npm packages (no workspaces — install each separately):

- `hcu-urban-model-builder-backend/` — FeathersJS 5 (Koa, REST + Socket.IO, TypeBox schemas, Knex/PostgreSQL), TypeScript ESM.
- `hcu-urban-model-builder-client/` — Ember (Embroider/webpack, TypeScript, Glint) app. Contains `canvas/`, a local v2 Ember addon (`hcu-urban-model-builder-react-canvas`) holding the React / `@xyflow/react` model-editing canvas.
- `bundle/` — packed tarballs of the backend's Feathers client, consumed by the client (see "Backend ↔ client coupling").
- `config/.env` (copied from `.env.sample` by setup) — env for docker-compose services (Postgres, Keycloak, Redis). `config/hcu-model-builder-realm.json` is the Keycloak realm export.

## Commands

Initial setup and infrastructure (from repo root):
```
npm run setup            # copies config/.env.sample -> config/.env, npm i in backend and client
docker compose up        # postgres:5432, keycloak:8081, redis:6379, adminer:8088
```

Backend (`cd hcu-urban-model-builder-backend`):
```
npm run migrate          # knex migrate:latest
npm run migrate:make <name>
npm run dev              # nodemon + ts-node, port 3030; Swagger UI for admin/ogcapi paths when not production
npm run compile          # tsc -> lib/
npm run prettier
npm test                 # migrates the test DB (NODE_ENV=test) then runs mocha
npm run mocha -- --grep "<pattern>"   # run a subset (test DB must already be migrated)
npm run hash-password <pw>            # produce ADMIN_TOKEN hash (also available from root)
```
Tests hit a real Postgres DB `hcu_urban_model_builder_test` (see `config/test.json`, port 8998), so `docker compose up` must be running. Config comes from `config/default.json` overridden by env vars mapped in `config/custom-environment-variables.json`.

Client (`cd hcu-urban-model-builder-client`):
```
npm run start            # ember serve, http://localhost:4200 (tests at /tests)
npm run lint             # js, hbs, css, types (tsc --noEmit)
npm run lint:fix
npm run test             # lint + ember test
npm run test:ember -- --filter "<module or test name>"   # single test/module
npm run build            # production build
npm run clear-cache      # clear Embroider cache when builds act strange
```

## Backend ↔ client coupling (important)

The client depends on the backend package via `"hcu-urban-model-builder-backend": "file:../bundle/hcu-urban-model-builder-backend-<version>.tgz"`. That tarball contains the compiled Feathers client (`src/client.ts`), all `*.shared.ts` files, and `src/shared/**` — notably the `SimulationAdapter`, which the client imports and runs **in the browser** (`app/components/floating-toolbar/simulate-modal.ts`) as well as on the server.

Consequently, changes to backend schemas, `*.shared.ts`, `client.ts`, or `src/shared/` are not visible to the client until a new bundle is published:
```
npm run feathers-client:version <patch|prerelease|...>   # from repo root
```
This runs `npm version` in the backend (its `postversion` compiles and packs into `bundle/`), rewrites the tarball reference in the client's `package.json` and the peer dependency in `canvas/package.json`, and reinstalls the client. Code in `src/shared/` must stay browser-safe.

## Backend architecture

- Each service under `src/services/<name>/` follows the Feathers CLI layout: `.class.ts` (service implementation, usually `KnexService`), `.schema.ts` (TypeBox schemas + resolvers), `.shared.ts` (client-side path/method registration), `.ts` (registration + hooks). Register new services in `src/services/index.ts` and `src/client.ts` (use `npx feathers generate service`).
- Global hooks in `src/app.ts`: OIDC (Keycloak) auth on all paths except `authentication`, `ogcapi/*`, and `admin/*` (admin uses bearer token checked against hashed `ADMIN_TOKEN`); `update` is rejected — always use `patch`; `patch`/`remove` stash the pre-change record under `STASH_BEFORE_KEY`; `createdAt`/`updatedAt` are stripped from input unless `params.isTouch`.
- Domain model: `models` → `models-versions` (draft/minor/major versioning; `newDraft`, `publishMinor`, `publishMajor`, `cloneVersion` custom methods on `ModelsService`) → `nodes` / `edges` (graph), plus `scenarios` / `scenarios-values` (parameter values per scenario). `models-users` holds sharing permissions; permission/version-state checks live in `src/hooks/` (`check-model-permission`, `check-model-version-state`, `add-model-permission-filter-query`). Published versions are read-only. `touchParent` bumps parent `updatedAt` when children change (disabled in tests).
- Node types (stock, flow, variable, converter, state, action, transition, agent, folder, OGC API Features, …) are defined in `nodes.shared.ts` / `nodes.schema.ts`; type-specific fields live in a `data` object.
- Simulation: `SimulationAdapter` (`src/shared/simulation-adapter/`) loads a model version's nodes/edges and builds a `simulation` library model via `primitive-factory.ts`. The OGC API Features node fetches features through `ogc-api-features-client.ts`; geometry is accessed via the special `GEOMETRY_KEY` (`__geometry__`) in `utils.ts`.
- OGC API Processes (`src/services/ogcapi/`) exposes published, UMP-approved models as processes for the Urban Model Platform. Execution goes through a BullMQ job queue on Redis (`src/init-job-queue.ts`, `src/utils/job-queue-adapter/`) which calls `models.simulate` with `serializeForUMP`.
- Real-time: `src/channels.ts` disables default publishing; events are published only to the `model-versions:<id>` channel (excluding the originating connection). The client joins/leaves these channels on route change (`app/services/model-version-channel-manager.ts`).

## Client architecture

- Ember Data talks to Feathers, not JSON:API: `app/adapters/application.ts` maps store operations to `feathers.app.service(...)` calls (`app/services/feathers.ts`); realtime service events are pushed into the store (`store-event-emitter`).
- The model editor is a React canvas (from `canvas/`) mounted inside Ember via `react-wrapper` and `app/services/ember-react-connector.ts`; communication between both sides goes through that connector and `event-bus`.
- `app/utils/create-demo-feathers-app.ts` provides an in-memory Feathers app (MemoryService) for the unauthenticated demo route.
- Translations in `translations/` (ember-intl); German legal pages (`datenschutz`, `impressum`, `nutzungsbedingungen`).

## Deployment

Run `./scripts/deploy.sh` on the server (staging compose files: `docker-compose-staging*.yml`; migrations via `Dockerfile.migrate` / `scripts/migrate.sh`).
