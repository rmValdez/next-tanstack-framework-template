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

- **Status:** accepted as a documented variant for platforms with tightly coupled domains. The
  template default stays D2.
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
