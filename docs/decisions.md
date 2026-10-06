# Decision Log

Choices made while designing the template, with the alternative and why it lost. New decisions are
added at the bottom.

---

### D1. Separate services with OIDC, not a shared session cookie

- **Chosen:** `accounts` is an OIDC provider; each app has its own session.
- **Alternative:** one Better Auth instance, sessions shared via a parent-domain cookie.
- **Why:** apps stay independently deployable, can live on unrelated domains, and a compromised app
  cannot read another app's sessions. Matches philgeps.

### D2. One database per service

- **Status:** superseded by D15 for business domains (2026-10-06). Still the right choice for a
  service that needs full isolation; `accounts_db` stays separate under both.
- **Chosen:** `accounts_db`, `web_db`.
- **Alternative:** one database, schemas per service.
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

### D13. Shared database variant with schema ownership

- **Status:** accepted; promoted from variant to the main design by D15 (2026-10-06).
- **Chosen:** `accounts_db` stays separate; domains share `company_db` with one schema and one role
  per domain, ownership enforced by grants, cross-domain reads through versioned `_public` views,
  cross-domain writes through the owner's API or events, no cross-owner foreign keys, one Prisma
  package and migration history per domain.
- **Alternative:** one database per domain (D2), or a shared database where any app can import any
  `-db` package (philgeps).
- **Why:** coupled domains (HR, finance, attendance) need cheap reads across each other, which
  separate databases make expensive. Postgres grants keep the ownership rule enforceable, which
  philgeps' shared imports did not.
- **Verified:** spike on Prisma 7.10.0 / Postgres 16. Required fixes: `CREATE ON DATABASE` per role,
  per-domain shadow database with `?schema=`. See
  [shared-database/spike-results.md](shared-database/spike-results.md).

### D14. Next.js default, TanStack libraries, TanStack Start by exception

- **Chosen:** Next.js is the default framework. TanStack libraries (Query, Table, Form) are approved
  in every app. TanStack Start is allowed for an app with a documented technical reason. The repo
  was renamed `next-tanstack-framework-template` to say this.
- **Alternative:** TanStack Start as the default (philgeps), or Next.js only.
- **Why:** one default avoids a framework debate per project; TanStack libraries run inside Next.js,
  so they don't require a second framework. Because sign-in, data and jobs are protocol boundaries
  (OIDC, database, queue), a Start app plugs into the same `accounts` without changes. Details:
  [company-stack.md](company-stack.md).

### D15. Real domain apps on `company_db`, not a generic example app

- **Date:** 2026-10-06.
- **Chosen:** the template is built around the company's real domain apps instead of a generic
  `web` client: `hr`, `finance`, `recruitment`, `attendance`, `exam`, plus `realtime` (Socket.IO)
  and `worker`. Each starts with minimal features but shows the full pattern: OIDC sign-in through
  `accounts`, its own schema in `company_db` (D13 rules, enforced by Postgres roles), a domain API,
  TanStack Query/Table/Form, cross-domain reads through `<domain>_public` views, and events where a
  workflow crosses domains. `accounts_db` stays separate. Built one at a time; `hr` is the reference
  implementation the others copy.
- **Order:** hr → finance (reads `hr_public`) → recruitment → attendance + realtime → exam.
- **Framework per app:** Next.js by default (D14). TanStack Start only where an app documents the
  reason; candidates are a highly interactive finance-operations UI or live exam-taking.
- **Alternative:** keep `web` as the only example client and document domain apps as a guide (the
  previous plan), or one database per domain (D2).
- **Why:** an example that mirrors the real platform shows the decisions teams actually face
  (schema ownership, cross-domain reads, events) instead of leaving them to each project. The
  coupled domains need cheap reads across each other, which D13 provides without shared writes.
- **Consequences:** `apps/web` became `apps/hr`; `packages/web-db` became `packages/hr-db` on
  `company_db?schema=hr` with role `hr_app`; `web_db` is no longer created.

### D16. Domain events: a worker process per domain, outbox and inbox

- **Date:** 2026-10-06. **Status:** decided, not built (features paused; see CLAUDE.md).
- **Chosen:** each domain app that consumes events gets `src/worker.ts`, run with `tsx` as its own
  process next to the Next server and connected as that domain's role (`<app>_app`). Events go
  through a topic exchange `domain.events` with versioned names (`recruitment.applicant.hired.v1`)
  and Zod schemas in `@workspace/core/events`. Each consumer has its own quorum queue
  (`hr.domain-events`) with a delivery limit and `<queue>.dlq`.
  - **Publisher: transactional outbox.** The state change and an `outbox` row are written in one
    transaction; the publisher's worker relays unsent rows (`FOR UPDATE SKIP LOCKED`), so a broker
    outage delays an event instead of losing it.
  - **Consumer: inbox.** The handler's writes and a `processed_events` row (event id) commit in
    one transaction, so redeliveries are no-ops. Invalid or unprocessable events go straight to
    the DLQ.
  - `pnpm dev` starts workers through a `worker:dev` Turbo task.
- **Alternatives:** consumer inside the Next server (instrumentation hook): no extra process, but
  tied to web scaling, duplicate consumers on dev reloads, no serverless. One central worker for
  all domains: would need every domain's role, breaking D13 ownership.
- **Why:** keeps "only the owner writes its schema" true for asynchronous work too, and scales
  consumers independently of web traffic.
- **First use:** phase 8, recruitment "applicant hired" → HR creates the employee.

