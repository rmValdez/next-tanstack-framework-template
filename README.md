# next-tanstack-framework-template

The company's full-stack platform template: one monorepo with a central identity app and one
application per business domain. **Next.js 15** for conventional apps, **TanStack Start** for highly
interactive ones, TanStack Query/Table/Form throughout. Built with **Better Auth** (OIDC),
**Prisma 7**, **PostgreSQL**, **RabbitMQ**, **pnpm** and **Turborepo**.

- `accounts` is the only identity provider (OAuth 2.0 / OpenID Connect).
- Every domain app signs in through it, owns its own database, and talks to other domains only
  through their APIs or events.
- `worker` runs background jobs (email today).

> **State (2026-10-07):** `accounts`, `worker`, `hr` (reference app) and `finance` are built,
> each domain on its own database, Finance calling HR's API with an accounts-issued app token;
> `recruitment`, `attendance` and `exam` are scaffolded. Next: the [roadmap](docs/roadmap.md)
> (global sign-out, exam on TanStack Start, new apps, events). Contributors and AI sessions:
> start with [CLAUDE.md](CLAUDE.md).

---

## Apps

| App                              | Framework                                     | URL                          | State                                                |
| :------------------------------- | :-------------------------------------------- | :--------------------------- | :--------------------------------------------------- |
| `hr`                             | Next.js                                       | http://localhost:5010        | Employees and departments (Table, Form, Query)       |
| `accounts`                       | Next.js                                       | http://localhost:5011        | Sign-in, sign-up, verification, reset, OIDC provider |
| `worker`                         | Node.js                                       | http://localhost:5012/health | Email jobs → SMTP                                    |
| `finance`                        | Next.js                                       | http://localhost:5013        | Payroll                                              |
| `recruitment`                    | Next.js                                       | http://localhost:5014        | Sign-in only                                         |
| `attendance`                     | Next.js                                       | http://localhost:5015        | Sign-in only                                         |
| `exam`                           | TanStack Start (Next.js until roadmap step 3) | http://localhost:5016        | Sign-in only                                         |
| `crm`, `operations`, `analytics` | Next.js                                       | planned                      | Roadmap step 4                                       |
| `collaboration`, `workspace`     | TanStack Start                                | planned                      | Roadmap step 4                                       |

Tools: Mailpit http://localhost:5004 · RabbitMQ http://localhost:5002 (guest / guest).

---

## Quick start

```bash
pnpm install
cp .env.example .env      # replace the change-me secrets
docker compose up -d      # Postgres, RabbitMQ, Mailpit
pnpm db:setup             # Prisma clients, migrations, seed
pnpm dev                  # every app
```

Open any app, click **Sign in**, use `admin@example.com` / `password123`.

---

## Documentation

| Document                                             | Read it for                                                             |
| :--------------------------------------------------- | :---------------------------------------------------------------------- |
| [CLAUDE.md](CLAUDE.md)                               | Current state, how to resume, fixed decisions, conventions (start here) |
| [ARCHITECTURE.md](ARCHITECTURE.md)                   | Apps, rules, authentication, data, async work, layout, security         |
| [docs/roadmap.md](docs/roadmap.md)                   | The work ahead, step by step, with done-checks                          |
| [docs/build-log.md](docs/build-log.md)               | What was built, how it was verified, gotchas found                      |
| [docs/decisions.md](docs/decisions.md)               | Every major decision, its alternative, and why                          |
| [docs/company-stack.md](docs/company-stack.md)       | Framework per app; when TanStack Start is justified                     |
| [docs/auth-flows.md](docs/auth-flows.md)             | SSO, sign-out, app-to-app tokens, accounts flows, cookies               |
| [docs/configuration.md](docs/configuration.md)       | Environment variables and ports                                         |
| [docs/development.md](docs/development.md)           | Scripts, making changes, debugging                                      |
| [docs/adding-a-service.md](docs/adding-a-service.md) | Adding a domain app, an API, a worker, a non-Next client                |
| [docs/deployment.md](docs/deployment.md)             | Production checklist and scaling                                        |
| [docs/origins.md](docs/origins.md)                   | What came from the monolith template and philgeps                       |

---

## Scripts

| Script            | Description                              |
| :---------------- | :--------------------------------------- |
| `pnpm dev`        | Every app in watch mode                  |
| `pnpm build`      | Production build                         |
| `pnpm type-check` | Type-check everything                    |
| `pnpm lint`       | Lint everything                          |
| `pnpm db:setup`   | Generate clients, migrate, seed          |
| `pnpm db:migrate` | Create a migration after a schema change |

Full list: [docs/development.md](docs/development.md).

## License

MIT
