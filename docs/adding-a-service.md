# Adding a Service

How to add a domain app, an API other apps can call, a background service, or a non-Next client.
The Next.js recipe below is how `finance`, `recruitment` and `attendance` were scaffolded from
`hr`; TanStack Start apps copy `apps/exam`.

---

## Naming

Every name derives from the app name. Databases use an underscore (a hyphenated Postgres name needs
quoting everywhere); npm packages use a hyphen.

| App      | DB package             | Database    | Role         | Env prefix | Cookie prefix | OAuth client id |
| :------- | :--------------------- | :---------- | :----------- | :--------- | :------------ | :-------------- |
| `people` | `@workspace/people-db` | `people_db` | `people_app` | `PEOPLE_`  | `people`      | `people`        |
| `<app>`  | `@workspace/<app>-db`  | `<app>_db`  | `<app>_app`  | `<APP>_`   | `<app>`       | `<app>`         |

`accounts` is the exception: `accounts_db`, connected as `postgres` in development.

---

## A new Next.js domain app

Example: `crm` on port 5017.

### 1. Database

- `docker/postgres/init.sql`: `CREATE ROLE crm_app LOGIN PASSWORD 'crm_pw';`,
  `CREATE DATABASE crm_db OWNER crm_app;`, `CREATE DATABASE crm_shadow OWNER crm_app;`,
  `REVOKE CONNECT ON DATABASE crm_db, crm_shadow FROM PUBLIC;`. On an existing volume, run the same
  statements by hand.
- Copy `packages/people-db` → `packages/crm-db` **without** `node_modules`, `prisma/generated`,
  `prisma/migrations`, `prisma/seed.ts`. Then:
  - `package.json`: name `@workspace/crm-db`, remove the `db:seed` script.
  - `prisma.config.ts`, `src/client.ts`: `CRM_DATABASE_URL`, `CRM_SHADOW_DATABASE_URL`; globalThis
    cache key `crmDb` (a shared key would hand one app another app's client in development).
  - `src/index.ts`: export `crmDb`.
  - `scripts/auth-schema.ts`: comment path `apps/crm/src/lib/auth.ts`.
  - `prisma/schema.prisma`: keep only the Better Auth models (`User`, `Session`, `Account`,
    `Verification`); domain models come later.
- `pnpm --filter @workspace/crm-db db:generate`, then
  `pnpm --filter @workspace/crm-db exec prisma migrate dev --name init`.

### 2. App

Copy `apps/people` → `apps/crm` without `node_modules`, `.next`, `tsconfig.tsbuildinfo`, `next-env.d.ts`.
Remove People's features: `src/features/`, `src/app/api/employees`, `src/app/api/departments`,
`src/app/(app)/employees`, `src/app/(app)/recruitment`, `src/app/(app)/attendance`. Then replace:

| Where                                                                                                  | Change                                                                                                       |
| :----------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `package.json`                                                                                         | `"name": "crm"`, `-p 5017` in `dev` and `start`, `@workspace/crm-db`                                         |
| `next.config.ts`                                                                                       | `transpilePackages`: `@workspace/crm-db`                                                                     |
| `src/lib/config.server.ts`                                                                             | `CRM_DATABASE_URL`, `CRM_AUTH_SECRET`, `CRM_OAUTH_CLIENT_ID/SECRET`                                          |
| `src/lib/auth.ts`                                                                                      | `crmDb`, `crmUrl`, `appName: "CRM"`, `cookiePrefix: "crm"`, client env vars, `postLogoutRedirectURI: crmUrl` |
| `src/lib/auth-client.ts`                                                                               | `crmUrl`                                                                                                     |
| `src/app/api/health/route.ts`                                                                          | `crmDb`                                                                                                      |
| `src/app/layout.tsx`, `src/components/AppHeader.tsx`, `AppNav.tsx`, `UserMenu.tsx`, `src/app/page.tsx` | Name, icon, landing text, nav links                                                                          |
| `src/app/(app)/dashboard/page.tsx`                                                                     | Identity card only (see `apps/recruitment` for the scaffold version)                                         |

Then `grep -ri "hr" apps/crm/src` for leftovers.

### 3. Register in shared files

| File                                  | Add                                                                                                                                       |
| :------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/urls.ts`           | `NEXT_PUBLIC_CRM_URL` in the schema, the input, and `export const crmUrl`                                                                 |
| `apps/accounts/src/lib/auth.ts`       | `crmUrl` in the import and `trustedOrigins`                                                                                               |
| `packages/accounts-db/prisma/seed.ts` | `NEXT_PUBLIC_CRM_URL`, `CRM_OAUTH_CLIENT_ID/SECRET` in the env schema; an entry in `CLIENTS`                                              |
| `.env.example`, `.env`                | `NEXT_PUBLIC_CRM_URL`, `CRM_DATABASE_URL`, `CRM_SHADOW_DATABASE_URL`, `CRM_AUTH_SECRET`, `CRM_OAUTH_CLIENT_ID`, `CRM_OAUTH_CLIENT_SECRET` |
| `turbo.json` `globalEnv`              | The same six names                                                                                                                        |

The seed derives the redirect URI (`${url}/api/auth/callback/accounts`) and post-logout URI
(`${url}/`, trailing slash required) from the URL.

### 4. Apply and check

```bash
pnpm install
pnpm --filter @workspace/accounts-db db:seed
pnpm dev
```

Check: landing page loads; `/dashboard` signed out → 307 to `/sso/start`; sign-in returns to
`/dashboard`; "Sign out" returns to the landing page and signs the user out of the other apps
too (the copied `src/app/api/backchannel-logout/route.ts` handles that; the seed registers its URI).

**Checklist:** `turbo.json` `concurrency` ≥ number of persistent dev tasks · unique port · cookie prefix · own database and role · own auth secret · client seeded ·
URL in `trustedOrigins` and `core/urls.ts` · env in `.env.example` and `turbo.json`.

---

## A new TanStack Start app

Copy `apps/exam` (without `node_modules`, `.output`, `.tanstack`) and follow the same database and
registration steps as for a Next app. Then replace:

| Where                                                                                               | Change                                                                 |
| :-------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| `package.json`                                                                                      | `"name"`, `--port` in `dev`, `PORT=` in `start`, `@workspace/<app>-db` |
| `vite.config.ts`                                                                                    | `server.port`                                                          |
| `src/lib/config.server.ts`, `src/lib/auth.ts`                                                       | `<APP>_*` env vars, `<app>Db`, `<app>Url`, `appName`, `cookiePrefix`   |
| `src/lib/auth-client.ts`                                                                            | `<app>Url`                                                             |
| `src/routes/api/health.ts`, `src/routes/api/backchannel-logout.ts`, `src/routes/_app/dashboard.tsx` | `<app>Db`, client id env var                                           |
| `src/routes/__root.tsx`, `index.tsx`, `src/components/AppHeader.tsx`                                | Title, landing text, icon                                              |

Rules that differ from Next.js (details in the build log, step 3):

- Server-only code lives in `*.server.ts` files or inside `createServerFn` handlers; Start's import
  protection fails the build if a client-reachable module imports `@tanstack/react-start/server`.
- Guard pages with a pathless layout's `beforeLoad`, and re-check the session inside every server
  function that returns private data (it is callable as RPC without the guard).
- Use **Zod 4** (the Nitro server bundle gets one `zod` copy and better-auth needs 4).
- `src/routeTree.gen.ts` is generated by the Vite plugin on `dev`/`build`; it is committed so
  `type-check` works on a fresh clone.

---

## An API other apps may call

Owner side (e.g. HR):

- Add the resource to accounts' `oauthProvider({ resources: [...] })` with an absolute URI
  identifier (`${hrUrl}/api/v1`) and its `allowedScopes` (`hr:employees.read`); add the scopes to
  the provider's `scopes` list.
- Serve the API under `/api/v1/...`, bearer-only, verified with `verifyBearerToken` (JWKS, issuer,
  audience = the identifier, required scope). Return a read model, not the raw table.

Caller side (e.g. finance):

- In the seed: add `client_credentials` to the client's `grantTypes`, the scopes to
  `clientCredentialsScopes`, and an `oauthClientResource` row linking the client to the resource.
- Fetch and cache a token from `/oauth2/token` (`grant_type=client_credentials`, `scope`,
  `resource`), call the API with `Authorization: Bearer`.

Concretely: add the API to `API_RESOURCES` and the caller to `API_GRANTS` in
`packages/core/src/apis.ts` (accounts config and seed pick both up), copy
`apps/hr/src/lib/app-token.ts` to the owner and `apps/finance/src/lib/hr-client.ts` to the caller,
then `pnpm --filter @workspace/accounts-db db:seed` and restart accounts. See D18 and
[auth-flows.md](auth-flows.md#5-app-to-app-calls-d18).

---

## A new background service

Email-style jobs: add the queue and job types to `packages/core/src/queue/types.ts`, then either add
a consumer to `apps/worker` or copy it to a new app if the jobs must scale separately.

Domain events (D16, not built yet): the consuming domain gets its own `src/worker.ts` connected to
its own database, with outbox (publisher) and inbox (consumer) tables.

---

## A non-Next client (mobile, SPA, another backend)

`accounts` is a standard OIDC provider, so any OIDC library works. Discovery:
`${NEXT_PUBLIC_ACCOUNTS_URL}/api/auth/.well-known/openid-configuration`. Register it in the seed;
public clients (mobile, SPA) use PKCE without a secret (`tokenEndpointAuthMethod: "none"`). Add its
origin to `trustedOrigins` if it calls accounts from a browser.
