# CLAUDE.md

Context for Claude Code sessions in this repo. Read this first, then the docs it points to. It is
written so a fresh session can resume exactly where the last one stopped.

## What this project is

`next-tanstack-framework-template`: the company's full-stack **platform template** in one pnpm +
Turborepo monorepo. A central identity app (`accounts`), one application per business domain, and a
background `worker`. Final architecture agreed with the user on 2026-10-06 (decisions D17–D20 in
[docs/decisions.md](docs/decisions.md)):

- `accounts` (Next.js, :5011): the only identity provider. Better Auth + `jwt` + `oauthProvider`
  (OIDC). Owns `accounts_db`. No business data.
- Domain apps, each with its **own database** `<app>_db` (D17), signing in through accounts:
  `hr` (Next.js, :5010, also company administration), `finance` (Next.js, :5013), `recruitment`
  (Next.js, :5014), `attendance` (Next.js, :5015), `exam` (**TanStack Start**, :5016); `crm` (:5017),
  `operations` (:5018), `analytics` (:5019) on Next.js, `collaboration` (:5020), `workspace` (:5021)
  on **TanStack Start**.
- `worker` (Express, :5012): background jobs; sends email from RabbitMQ via SMTP (Mailpit in dev).
- Cross-domain: never SQL. The owner's `/api/v1` with an accounts-issued app token (D18), later
  domain events (D16). Global sign-out is required (D19).

Shared packages: `packages/accounts-db`, `packages/<app>-db` per domain (Prisma 7 +
`@prisma/adapter-pg`), `packages/core` (env, URLs, queue types + producer), `packages/ui`.

## Where we are (2026-10-07)

| Area                                                                          | State                                                                                                                                    |
| :---------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| `accounts`, `worker`                                                          | Built and verified                                                                                                                       |
| `hr`                                                                          | Built: reference domain app (employees/departments, TanStack Table v9 + Form + Query, session API)                                       |
| `finance`                                                                     | Built: payroll; reads employees through HR's `/api/v1` with an accounts-issued app token                                                 |
| `recruitment`, `attendance`                                                   | Scaffolded from hr (Next.js): landing, sign-in, dashboard, sign-out                                                                      |
| `exam`                                                                        | Scaffolded on **TanStack Start** (reference for collaboration/workspace)                                                                 |
| `crm`, `operations`, `analytics` (Next), `collaboration`, `workspace` (Start) | Scaffolded (step 4): sign-in, dashboard, global sign-out                                                                                 |
| Data                                                                          | One database per domain (`<app>_db`, D17); `company_db` dropped 2026-10-07                                                               |
| App-to-app tokens (D18)                                                       | Built: finance → HR via `@workspace/core/apis`                                                                                           |
| Global sign-out (D19)                                                         | Built: OIDC back-channel logout, `@workspace/core/oidc`, one Sign out button                                                             |
| Events                                                                        | Decided, not built (roadmap step 5)                                                                                                      |
| Checks                                                                        | One `pnpm dev` runs all 12 services; SSO + global sign-out verified across all 10 domain apps; type-check 36/36, lint 12/12, build 22/22 |
| Docs                                                                          | Rewritten 2026-10-07 for the final architecture; state markers say what is built vs planned                                              |

Last commits: `97a9a1d` step 1, `8fede9f` step 2, `ef01c30` step 3, then step 4. Not pushed.

## Resume here

Follow [docs/roadmap.md](docs/roadmap.md). Steps 1–4 are done: every app in the agreed list runs
(own database, SSO, app tokens, global sign-out; exam/collaboration/workspace on TanStack Start).
**Next: step 5, domain events (D16).** It is the first step that adds domain features
(recruitment candidates → HR employees), which the user paused; confirm with the user before
starting it. Feature work for recruitment/attendance etc. is paused by
the user until those steps are done ("the idea is they are working and running").

Standing rule per step: one `pnpm dev` starts everything, each UI app reaches its landing page with
no errors; type-check, lint, build pass; docs updated; commit (no Claude trailers).

## Local environment notes

- The user edits `.env` by hand (own secrets; also added `ACCESS_TOKEN_EXPIRY`,
  `REFRESH_TOKEN_EXPIRY`, not read by anything yet: ask before wiring them). When changing env
  values programmatically, change only the lines needed.
- After secret changes: `pnpm --filter @workspace/accounts-db db:seed` (client secrets); if
  `ACCOUNTS_AUTH_SECRET` changed, `DELETE FROM jwks` in accounts_db (dev). Both done 2026-10-06.
- The running Postgres volume (`next_tanstack_tpl_db`) matches `init.sql`: `accounts_db`,
  `<app>_db` + `<app>_shadow` per domain, roles `<app>_app`. `init.sql` only runs on a new volume; changes are applied by hand.
- Infra containers: `next_tanstack_tpl_db`, `_rabbitmq`, `_mailpit` (docker compose).

## Documentation map

| File                                                 | Contents                                                                  |
| :--------------------------------------------------- | :------------------------------------------------------------------------ |
| [README.md](README.md)                               | Overview, apps, quick start, doc index                                    |
| [ARCHITECTURE.md](ARCHITECTURE.md)                   | Apps, rules, auth, data, async work, layout, security (target + state)    |
| [docs/roadmap.md](docs/roadmap.md)                   | **The work ahead**, step by step, with researched details and done-checks |
| [docs/build-log.md](docs/build-log.md)               | What was built per phase, verification results, gotchas                   |
| [docs/decisions.md](docs/decisions.md)               | Decision log D1–D20 (with superseded statuses)                            |
| [docs/company-stack.md](docs/company-stack.md)       | Framework per app, when TanStack Start is justified                       |
| [docs/auth-flows.md](docs/auth-flows.md)             | SSO, sign-out, app-to-app tokens, accounts flows, cookies                 |
| [docs/configuration.md](docs/configuration.md)       | Env variables, ports                                                      |
| [docs/development.md](docs/development.md)           | Scripts, making changes, debugging table                                  |
| [docs/adding-a-service.md](docs/adding-a-service.md) | Scaffolding recipe for new apps, APIs, workers                            |
| [docs/deployment.md](docs/deployment.md)             | Production checklist                                                      |
| [docs/origins.md](docs/origins.md)                   | Copy map from the monolith, differences from philgeps                     |

When code is built, update the docs to match and the state markers ("planned", "not built").

## Where it comes from

- **Created from** `../next-betterAuth-monolith-template`. Never modify it; read it as the source.
- **Architecture follows** `C:\Users\My PC\Documents\Github\personal\government-philgeps-workspace\philgeps-workspace`
  (TanStack Start + Bun). Read-only; its `apps/philgeps/src/lib/auth.ts` is the reference for
  Better Auth on TanStack Start (`tanstackStartCookies()`).

## Fixed decisions (don't re-litigate)

pnpm · Turborepo · Next.js 15.5 (not 16) for conventional apps · TanStack Start for exam,
collaboration, workspace (D20) · TanStack Query/Table(v9)/Form(v1) · Zod 3 in Next apps, Zod 4 in TanStack Start apps · Prisma 7.x (not 8 RC) ·
Better Auth 1.7.x + `@better-auth/oauth-provider` same version · OIDC as the authentication standard ·
one database per domain `<app>_db`, `accounts_db` separate, no `admin_db` (HR) · no SQL across
domains; owner APIs with app tokens; events later · global sign-out required · Zod · Tailwind 3 ·
ESLint + Prettier · RabbitMQ (amqplib 2.x) · nodemailer · plain escaped HTML email · worker on `tsx` ·
no Redis in v1 · hashed OAuth client secrets · email verification by link.

## Facts verified against better-auth@1.7.7

- OIDC endpoints on accounts: `/api/auth/oauth2/{authorize,token,userinfo,end-session,revoke,introspect,consent,continue}`,
  discovery `/api/auth/.well-known/openid-configuration`, keys `/api/auth/jwks`. Issuer
  `${NEXT_PUBLIC_ACCOUNTS_URL}/api/auth`; ID tokens EdDSA. A failed client auth at `/oauth2/token`
  consumes the code.
- genericOAuth providers are social providers in 1.7: sign in with
  `signIn.social({ provider: "accounts" })`; no client plugin; redirect URI
  `${NEXT_PUBLIC_<APP>_URL}/api/auth/callback/accounts`.
- Token endpoint auth must match the registered method: apps use
  `tokenEndpointAuth: { method: "client_secret_basic" }`.
- `oauthProvider` resumes `/login` via a signed query; `/login` needs `oauthProviderClient()`.
  `consentPage` is required.
- Client secrets stored hashed (SHA-256 → base64url); the seed hashes the same way.
- Back-channel logout: the provider sends `logout+jwt` tokens to each client's
  `backchannelLogoutUri` when an accounts session is deleted; the RP side is ours
  (`@workspace/core/oidc`). Client side of Better Auth has no receiver.
- `signOut()` also ends the accounts session unless `disableRedirect: true`;
  `post_logout_redirect_uri` always ends in `/`, registered that way by the seed.
- Schema generation: package `auth` (`pnpm auth:schema`), not `@better-auth/cli`.
- App tokens: `oauthProvider` `resources` + `scopes`, seed `client_credentials` +
  `clientCredentialsScopes` + `oauthClientResource` link; tokens requested with `resource`
  are JWTs (`aud` = resource), without it opaque. Verify with
  `@better-auth/oauth-provider/resource-client` `verifyBearerToken` (build log, step 1).
- Distinct `advanced.cookiePrefix` per app; OAuth state cookie `maxAge: 600`.
- `.env` secret changes: client secret → re-seed; `ACCOUNTS_AUTH_SECRET` → JWKS key unreadable
  (dev: `DELETE FROM jwks`). Restart apps after any `.env` change.

Other verified gotchas (details in the build log): Prisma 7 `migrate dev` doesn't generate; match
Prisma errors by `error.code` not `instanceof` (bundled copies); no `loading.tsx` above guarded pages
(redirect would stream as 200); root script is `pnpm db:setup` (`pnpm setup` is built in); pin
`prisma@^7`; TanStack Table v9 needs explicit `tableFeatures({...})` and ships agent docs in
`node_modules/@tanstack/react-table/skills`; Bash heredocs with certain quote mixes fail in this
shell: write scripts to files instead. TanStack Start: server-only code in `*.server.ts`, Zod 4,
`routeTree.gen.ts` committed; every app gets auth via `getAuth()` (self-healing, see build log
step 3).

## Conventions

- Match the monolith's code style: comments explain _why_, Zod env parsed at import, server-only
  secrets in `config.server.ts`, never imported by client components.
- Domain app layout follows `apps/hr` (see ARCHITECTURE.md §7): `src/features/<x>/` with a Zod
  schema shared by form and API, `server.ts`, `queries.ts`, Table/Form/View components; guarded
  pages call `requireAuth(path)`; route handlers call `requireApiSession()`.
- Naming per app `<app>`: package `@workspace/<app>-db`, database `<app>_db`, role `<app>_app`, env
  `<APP>_*`, cookie prefix and OAuth client id `<app>`.
- Workspace packages export TypeScript source; Next apps use `transpilePackages`.
- One root `.env`; Next apps load it with `dotenv -e ../../.env --` in package scripts.
- Git: remote `origin` = github.com/rmValdez/next-tanstack-framework-template, branch `main`. No
  Claude co-author trailers in commits. Commit at the end of each step; ask before pushing.
- Shell is Windows (PowerShell primary, Git Bash available).

## Working with the user

- The user often pastes long architecture proposals (from other chats). Compare them against the
  repo and the decision log, point out conflicts and what is already done, and ask before acting
  on anything that reverses a decision.
- The user often asks questions to understand ("just asking"). Answer; don't build unless they say
  to proceed.
- Keep answers short and concrete; tables and small diagrams work well.
