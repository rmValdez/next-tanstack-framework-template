# Decision Log

Choices made while designing the template, with the alternative and why it lost. New decisions are
added at the bottom. A later decision can supersede an earlier one; the earlier entry then says so
in its **Status** line and stays for the history.

**Current architecture in one paragraph** (D17–D20): one monorepo; `accounts` is the only identity
provider (OIDC, `accounts_db`); one app per business domain, each with its **own database**
(`<app>_db`); Next.js for conventional apps, TanStack Start for `exam`, `collaboration` and
`workspace`; domains never touch each other's database, they call the owner's API with an
accounts-issued app token, or (later) exchange events; signing out anywhere signs out everywhere;
`worker` stays a separate Node process.

---

### D1. Separate services with OIDC, not a shared session cookie

- **Status:** confirmed again 2026-10-06 (D19): OIDC stays the authentication standard.
- **Chosen:** `accounts` is an OIDC provider; each app has its own session.
- **Alternative:** one Better Auth instance, sessions shared via a parent-domain cookie.
- **Why:** apps stay independently deployable, can live on unrelated domains, and a compromised app
  cannot read another app's sessions. OIDC is plain HTTP, so TanStack Start apps use it unchanged.
  Matches philgeps.

### D2. One database per service

- **Status:** superseded by D15 on 2026-10-06, then **reinstated by D17** the same day for every
  domain.
- **Chosen:** each service owns a separate Postgres database.
- **Alternative:** one database, schemas per service (D13).
- **Why:** enforces the ownership rule at the connection level. A service can move to its own server
  without a data migration.

### D3. Next.js 15.5, not 16

- **Why:** matches the monolith template, so code and fixes port between them. Upgrade both
  together later.

### D4. Prisma 7 with `@prisma/adapter-pg`

- **Alternative:** Prisma 6 (monolith), Prisma 8 (release candidate).
- **Why:** same as philgeps; Prisma 8 is not stable yet.

### D5. pnpm + Turborepo

- **Alternative:** Bun (philgeps).
- **Why:** matches the monolith template; Next.js tooling is most tested on Node + pnpm.

### D6. Hashed OAuth client secrets

- **Alternative:** plain text (philgeps).
- **Why:** a database leak should not leak working client credentials. It's the plugin default, so
  it costs nothing. The seed hashes with the same SHA-256/base64url function the plugin uses.

### D7. Signed `oauth_query` for login resume

- **Alternative:** manual redirect to `/oauth2/authorize` with the raw query (philgeps).
- **Why:** supported natively in `@better-auth/oauth-provider` 1.7 through `oauthProviderClient()`.
  The signature stops a crafted login URL from resuming someone else's authorization request.

### D8. RabbitMQ for email, not in-process sending

- **Alternative:** `sendEmail()` inside `accounts` (monolith).
- **Why:** a slow or failing SMTP provider cannot slow down sign-up, failed sends retry, and the
  same queue carries future background jobs.

### D9. Plain HTML templates, escaped

- **Alternative:** React Email (philgeps).
- **Why:** two templates do not justify the dependency. The template interface is small enough to
  swap later.

### D10. Verification link, not OTP

- **Why:** carried over from the monolith; one click, no code to type, and Better Auth supports it
  natively. The `email-otp` plugin can replace it if a project prefers codes.

### D11. Worker runs on `tsx`

- **Alternative:** compile with tsc/esbuild.
- **Why:** no build step for a small service; the shared packages are TypeScript source. Revisit if
  cold-start time matters.

### D12. No Redis in v1

- **Why:** nothing requires it until rate limits must be shared across instances. Documented as a
  pre-scale step in [deployment.md](deployment.md).

### D13. Shared `company_db` with one schema per domain

- **Status:** built and verified on 2026-10-06 (phases 6–7), then **superseded by D17**;
  `company_db` was dropped on 2026-10-07 (roadmap step 1).
- **Chosen (then):** domains shared `company_db`, one schema and one Postgres role per domain,
  ownership enforced by grants, cross-domain reads through versioned `<domain>_public` views.
- **Why it lost:** reads through views still couple domains at the SQL level, and splitting a
  domain out later means replacing those views anyway. D17 forces the API boundary from day one.
- **Lessons worth keeping** (Prisma 7.10 / Postgres 16): a restricted role needs a dedicated shadow
  database for `prisma migrate dev`; `?schema=` must be on both the main and shadow URL; Prisma
  Migrate cannot create views, so they go in hand-written migrations; a column used by a view
  cannot be altered until the view is dropped.

### D14. Next.js default, TanStack libraries, TanStack Start where justified

- **Status:** refined by D20, which names the TanStack Start apps.
- **Chosen:** Next.js is the default framework. TanStack libraries (Query, Table, Form) are approved
  in every app. TanStack Start is used where the app's interaction model justifies it.
- **Alternative:** TanStack Start as the default (philgeps), or Next.js only.
- **Why:** one default avoids a framework debate per project; TanStack libraries run inside Next.js,
  so they don't require a second framework. Because sign-in, data and jobs are protocol boundaries
  (OIDC, database, queue), a Start app plugs into the same `accounts` without changes. Details:
  [company-stack.md](company-stack.md).

### D15. Real domain apps, not a generic example app

- **Date:** 2026-10-06. **Status:** the "real domain apps" part stands (extended by D20); the
  `company_db` data part is **superseded by D17**.
- **Chosen:** the template is built around the company's real domain apps instead of a generic
  `web` client. Each starts with minimal features but shows the full pattern: OIDC sign-in through
  `accounts`, its own data, a domain API, TanStack Query/Table/Form, and the cross-domain rules.
  `hr` is the reference implementation the others copy.
- **Consequences:** `apps/web` became `apps/hr`; `packages/web-db` became `packages/hr-db`.

### D16. Domain events: a worker process per domain, outbox and inbox

- **Date:** 2026-10-06. **Status:** decided, not built ([roadmap](roadmap.md) step 5).
- **Chosen:** each domain app that consumes events gets `src/worker.ts`, run with `tsx` as its own
  process next to the web server and connected to that domain's own database. Events go through a
  topic exchange `domain.events` with versioned names (`recruitment.candidate.hired.v1`) and Zod
  schemas in `@workspace/core/events`. Each consumer has its own quorum queue
  (`hr.domain-events`) with a delivery limit and `<queue>.dlq`.
  - **Publisher: transactional outbox.** The state change and an `outbox` row are written in one
    transaction; the publisher's worker relays unsent rows (`FOR UPDATE SKIP LOCKED`), so a broker
    outage delays an event instead of losing it.
  - **Consumer: inbox.** The handler's writes and a `processed_events` row (event id) commit in
    one transaction, so redeliveries are no-ops. Invalid or unprocessable events go straight to
    the DLQ.
  - `pnpm dev` starts domain workers through a `worker:dev` Turbo task.
- **Alternatives:** consumer inside the web server (instrumentation hook): no extra process, but
  tied to web scaling, duplicate consumers on dev reloads, no serverless. One central worker for
  all domains: it would need every domain's database credentials, breaking ownership.
- **Why:** keeps "only the owner writes its data" true for asynchronous work too, and scales
  consumers independently of web traffic.
- **First uses:** recruitment "candidate hired" → HR creates the employee; HR "employee created" →
  finance, attendance; domain events → analytics read models.

### D17. One database per domain (`<app>_db`), replacing `company_db`

- **Date:** 2026-10-06. **Status:** built and verified 2026-10-07 ([build log](build-log.md), step 1).
- **Chosen:** `accounts_db` for identity, and one database per business domain: `hr_db`,
  `finance_db`, `recruitment_db`, `attendance_db`, `exam_db`, `crm_db`, `operations_db`,
  `analytics_db`, `collaboration_db`, `workspace_db`. Each is owned by its role `<app>_app`, with
  `CONNECT` revoked from everyone else, plus a `<app>_shadow` database for `prisma migrate dev`.
  Names follow the app (`hr_db`, not `human_resources_db`). No `admin_db`: administration belongs to
  HR. Tables use the database's default `public` schema (no `@@schema` tags).
- **Cross-domain reads:** never SQL across databases and no recreated `_public` views. A domain
  reads another through the **owner's API** with an accounts-issued app token (D18), later through
  read models fed by events (D16).
- **Alternative:** keep `company_db` with schemas (D13).
- **Why:** the user's goal is independent domain ownership and a clean path to microservices;
  separate databases make the API boundary the only possible one, and a domain can move to its own
  server with no untangling.

### D18. App-to-app calls: accounts-issued JWT access tokens (client credentials)

- **Date:** 2026-10-06. **Status:** built and verified 2026-10-07 ([build log](build-log.md), step 1).
- **Where:** `@workspace/core/apis` (`API_RESOURCES`, `API_SCOPES`, `API_GRANTS`, response
  contracts like `HrEmployeeV1`) is the single definition used by accounts' `oauthProvider`
  config, its seed, the owner (`apps/hr/src/lib/app-token.ts`) and the caller
  (`apps/finance/src/lib/hr-client.ts`).
- **Chosen:** a calling app (e.g. finance) is an OAuth client with the `client_credentials` grant.
  It asks accounts for a token with `resource=<owner API identifier>` and a scope such as
  `hr:employees.read`. Accounts declares each owner API as an `oauthProvider` **resource**
  (`resources` option: identifier, `allowedScopes`) and the seed links calling clients to the
  resources they may use (`oauthClientResource`). The token is a JWT with `aud` = that resource.
  The owner app verifies it locally with `oauthProviderResourceClient().getActions().verifyBearerToken`
  from `@better-auth/oauth-provider/resource-client` (JWKS, issuer, audience, required scopes).
  Owner APIs for other apps live under `/api/v1/...`, separate from the session-based UI routes.
- **Alternative:** shared static API keys between apps; or forwarding the end user's session.
- **Why:** standard OAuth, already supported by the provider we run; per-app, per-scope, short-lived,
  revocable credentials; no shared secrets between domains.

### D19. OIDC stays; global sign-out is required

- **Date:** 2026-10-06. **Status:** built and verified 2026-10-07 ([build log](build-log.md), step 2).
- **Chosen:** keep OIDC as the authentication standard (D1). Signing out in any app ends the
  accounts session **and** every app's local session, through **OIDC Back-Channel Logout**:
  `@better-auth/oauth-provider` 1.7.7 sends signed logout tokens to each client's
  `backchannelLogoutUri` when an accounts session is deleted; each app verifies the token
  (`@workspace/core/oidc`) and deletes the user's sessions. The UI has a single "Sign out".
- **Alternatives:** front-channel logout (iframes; unreliable with third-party cookie blocking);
  apps checking the accounts session on every request (an accounts call per request).
- **Why:** user requirement ("sign out from Finance → must authenticate again everywhere"), and it
  is supported natively on the provider side.

### D20. Final application list and framework per app

- **Date:** 2026-10-06.
- **Chosen:**

  | App             | Framework          | Responsibility                                                | State                                 |
  | :-------------- | :----------------- | :------------------------------------------------------------ | :------------------------------------ |
  | `accounts`      | Next.js            | Identity, authentication, OIDC                                | Built                                 |
  | `hr`            | Next.js            | Employees, departments, positions, **company administration** | Built (reference app)                 |
  | `finance`       | Next.js            | Payroll, accounting                                           | Built (payroll)                       |
  | `recruitment`   | Next.js            | Candidates, hiring                                            | Scaffolded                            |
  | `attendance`    | Next.js            | Attendance, schedules, time tracking                          | Scaffolded                            |
  | `exam`          | **TanStack Start** | Exams, timed / live assessment                                | Scaffolded on TanStack Start (step 3) |
  | `crm`           | Next.js            | Customers, contacts, leads                                    | Planned (step 4)                      |
  | `operations`    | Next.js            | Operational workflows                                         | Planned (step 4)                      |
  | `analytics`     | Next.js            | Reporting, dashboards; owns aggregated data only              | Planned (step 4)                      |
  | `collaboration` | **TanStack Start** | Realtime collaboration, communication                         | Planned (step 4)                      |
  | `workspace`     | **TanStack Start** | Projects, tasks, documents                                    | Planned (step 4)                      |
  | `worker`        | Node.js (Express)  | Background jobs, email, scheduled work                        | Built (email)                         |

- **Rules:** separate apps by business domain; independent apps first, microservices only when
  justified; shared **technical** packages are fine (`ui`, `core`, auth/OIDC client helpers), shared
  business models are not; analytics never owns another domain's source data.
- **Replaces:** the earlier `realtime` app idea (its job moves to `collaboration`) and a separate
  `admin` app (HR covers it).
