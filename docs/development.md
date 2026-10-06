# Development Guide

Running, changing, and debugging the template locally.

> **Status:** commands work for what is built so far (phases 1–5: `pnpm db:setup`, `accounts` and
> `worker`). `web` arrives in phase 6 of the [implementation plan](implementation-plan.md).

---

## Requirements

- Node.js 20+
- pnpm 10 (`corepack enable`)
- Docker (for Postgres, RabbitMQ, Mailpit)

---

## First run

```bash
pnpm install
cp .env.example .env            # then replace the change-me secrets
docker compose up -d            # Postgres, RabbitMQ, Mailpit
pnpm db:setup                   # generate Prisma clients, migrate, seed
pnpm dev                        # accounts, web, worker together
```

Then:

1. Open http://localhost:5010 and click **Sign in**.
2. Sign in as the seeded admin (`admin@example.com` / `password123`), or create an account.
3. New accounts: open Mailpit at http://localhost:5004, click the verification link, then sign in
   from `web` again.

---

## Scripts

Run from the repo root. Turborepo fans each one out to every app and package that defines it.

| Script              | What it does                                                |
| :------------------ | :---------------------------------------------------------- |
| `pnpm dev`          | All services in watch mode                                  |
| `pnpm build`        | Production build of every app                               |
| `pnpm start`        | Run built apps                                              |
| `pnpm type-check`   | `tsc --noEmit` everywhere                                   |
| `pnpm lint`         | ESLint everywhere                                           |
| `pnpm format`       | Prettier on the whole repo                                  |
| `pnpm db:generate`  | Generate both Prisma clients                                |
| `pnpm db:migrate`   | Create and apply a new migration (interactive)              |
| `pnpm db:deploy`    | Apply existing migrations                                   |
| `pnpm db:seed`      | Seed `accounts_db` (admin user, `web` OAuth client)         |
| `pnpm db:setup`        | `db:generate` + `db:deploy` + `db:seed`                     |

Run one service only:

```bash
pnpm --filter accounts dev
pnpm --filter web dev
pnpm --filter worker dev
```

---

## Making changes

### A schema change

```bash
# edit packages/web-db/prisma/schema.prisma
pnpm --filter @workspace/web-db db:migrate --name add_projects
```

Commit the generated migration folder. Never edit an applied migration.

### A new email

1. Add a variant to the `EmailJob` union in `packages/core/src/queue/types.ts`.
2. Add its template in `apps/worker/src/email/templates.ts`. TypeScript forces both sides to agree.
3. Call `publishEmail({ template: "<name>", to, data })` from the producing service.

### Shared UI

Components in `packages/ui` are used by both Next apps. Tailwind in each app scans
`../../packages/ui/src/**`, so new classes there are picked up without extra config.

---

## Debugging

| Symptom                                  | Likely cause / fix                                                     |
| :--------------------------------------- | :--------------------------------------------------------------------- |
| App exits with `Invalid server environment variables` | A variable in `.env` is missing or too short; the message lists each one. |
| `invalid_redirect_uri` on sign-in        | `NEXT_PUBLIC_WEB_URL` changed without re-seeding. Run `pnpm db:seed`.  |
| `invalid_client` at the token step       | `WEB_OAUTH_CLIENT_SECRET` differs from what was seeded. Re-seed.       |
| `state_mismatch` after login             | Two sign-in attempts overwrote each other's state cookie, or a login took over 10 minutes. Retry once. |
| `invalid_signature` on `/login`          | The login URL was edited or expired. Start sign-in again from `web`.   |
| No email in Mailpit                      | Worker not running, or RabbitMQ down. Check http://localhost:5012/health and the accounts log. |
| Signed in on accounts but not on web     | Expected: sessions are per app. Click **Sign in** on `web`; it is one click. |
| Prisma: `@prisma/client did not initialize` | Run `pnpm db:generate`.                                             |

Useful views:

- RabbitMQ queues and messages: http://localhost:5002 (guest / guest)
- Mailpit inbox: http://localhost:5004
- Databases: `pnpm --filter @workspace/accounts-db exec prisma studio`

---

## Resetting everything

```bash
docker compose down -v          # deletes database and broker volumes
docker compose up -d
pnpm db:setup
```
