# Adding a Service

How to add a domain app, an API other apps can call, a background service, or a non-Next client.
The recipe below is how `finance`, `recruitment`, `attendance` and `exam` were scaffolded from `hr`.

---

## Naming

Every name derives from the app name. Databases use an underscore (a hyphenated Postgres name needs
quoting everywhere); npm packages use a hyphen.

| App     | DB package            | Database   | Role        | Env prefix | Cookie prefix | OAuth client id |
| :------ | :-------------------- | :--------- | :---------- | :--------- | :------------ | :-------------- |
| `hr`    | `@workspace/hr-db`    | `hr_db`    | `hr_app`    | `HR_`      | `hr`          | `hr`            |
| `<app>` | `@workspace/<app>-db` | `<app>_db` | `<app>_app` | `<APP>_`   | `<app>`       | `<app>`         |

`accounts` is the exception: `accounts_db`, connected as `postgres` in development.

> Until [roadmap](roadmap.md) step 1 is done, existing domains use `company_db?schema=<app>`
> instead of `<app>_db`. New apps should wait for step 1 or follow the current pattern.

---

## A new Next.js domain app

Example: `crm` on port 5017.

### 1. Database

- `docker/postgres/init.sql`: `CREATE ROLE crm_app LOGIN PASSWORD 'crm_pw';`,
  `CREATE DATABASE crm_db OWNER crm_app;`, `CREATE DATABASE crm_shadow OWNER crm_app;`,
  `REVOKE CONNECT ON DATABASE crm_db, crm_shadow FROM PUBLIC;`. On an existing volume, run the same
  statements by hand.
- Copy `packages/hr-db` → `packages/crm-db` **without** `node_modules`, `prisma/generated`,
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

Copy `apps/hr` → `apps/crm` without `node_modules`, `.next`, `tsconfig.tsbuildinfo`, `next-env.d.ts`.
Remove HR's feature: `src/features/`, `src/app/api/employees`, `src/app/api/departments`,
`src/app/(app)/employees`. Then replace:

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
`/dashboard`; "Sign out everywhere" returns to the landing page.

**Checklist:** unique port · cookie prefix · own database and role · own auth secret · client seeded ·
URL in `trustedOrigins` and `core/urls.ts` · env in `.env.example` and `turbo.json`.

---

## A new TanStack Start app

After [roadmap](roadmap.md) step 3, `apps/exam` is the TanStack Start reference: copy it instead of
`apps/hr` and follow the same database and registration steps. Sign-in uses the same
`genericOAuth` config with `tanstackStartCookies()` instead of `nextCookies()`.

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

Details and the researched option names: [roadmap](roadmap.md) step 1b, D18.

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
