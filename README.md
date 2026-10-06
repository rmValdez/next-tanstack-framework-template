# next-tanstack-framework-template

The company's full-stack starter: multi-service **Next.js 15** apps with the **TanStack** libraries,
sharing one identity provider, built with **Better Auth**, **Prisma 7**, **PostgreSQL**, **RabbitMQ**,
**pnpm**, and **Turborepo**. Which framework and libraries to use for which kind of app:
[docs/company-stack.md](docs/company-stack.md).

- `accounts` owns users and passwords and acts as an **OAuth 2.0 / OpenID Connect provider**.
- `web` (and any app you add) signs users in through `accounts` and keeps its own database.
- `worker` sends email from a RabbitMQ queue.

It follows the architecture of the philgeps workspace on Next.js, and is the multi-service
counterpart of `next-betterAuth-monolith-template`.

> **Status:** design complete, implementation in progress. See the
> [implementation plan](docs/implementation-plan.md).

---

## Services

| Service    | URL                     | What it does                                       |
| :--------- | :---------------------- | :------------------------------------------------- |
| `web`      | http://localhost:5010   | Example app: landing page, protected dashboard     |
| `accounts` | http://localhost:5011   | Sign-in, sign-up, verification, reset, OIDC provider |
| `worker`   | http://localhost:5012   | Email jobs → SMTP (health endpoint only)           |
| Mailpit    | http://localhost:5004   | Inbox for every email sent in development          |
| RabbitMQ   | http://localhost:5002  | Queue dashboard (guest / guest)                    |

---

## Quick start

```bash
pnpm install
cp .env.example .env      # replace the change-me secrets
docker compose up -d      # Postgres, RabbitMQ, Mailpit
pnpm db:setup             # Prisma clients, migrations, seed
pnpm dev                  # all services
```

Open http://localhost:5010, click **Sign in**, and use `admin@example.com` / `password123`.

---

## Repository layout

```
apps/
  accounts/      Next.js identity provider
  web/           Next.js client app
  worker/        Express + RabbitMQ email worker
packages/
  accounts-db/   Prisma schema + client for accounts_db
  web-db/        Prisma schema + client for web_db
  core/          Env validation, service URLs, queue types + producer
  ui/            Shared React components
docs/            Documentation (below)
```

---

## Documentation

| Document                                          | Read it for                                             |
| :------------------------------------------------ | :------------------------------------------------------ |
| [ARCHITECTURE.md](ARCHITECTURE.md)                | Services, diagrams, data model, security overview       |
| [docs/auth-flows.md](docs/auth-flows.md)          | SSO handshake, sign-up, reset, sign-out, cookies, endpoints |
| [docs/configuration.md](docs/configuration.md)    | Every environment variable and port                     |
| [docs/development.md](docs/development.md)        | Scripts, making changes, debugging                      |
| [docs/adding-a-service.md](docs/adding-a-service.md) | Adding a client app, worker, or non-Next client      |
| [docs/deployment.md](docs/deployment.md)          | Production checklist and scaling                        |
| [docs/implementation-plan.md](docs/implementation-plan.md) | Build phases and their checks                  |
| [docs/company-stack.md](docs/company-stack.md)    | Framework policy: Next.js default, TanStack, when to use TanStack Start |
| [docs/decisions.md](docs/decisions.md)            | Why each major choice was made                          |
| [docs/shared-database/](docs/shared-database/README.md) | Variant: several domains in one Postgres database with schema ownership |
| [docs/philgeps-comparison.md](docs/philgeps-comparison.md) | What matches and differs from philgeps-workspace |
| [docs/monolith-comparison.md](docs/monolith-comparison.md) | What differs from the monolith template and what is copied from it |

---

## Scripts

| Script            | Description                                  |
| :---------------- | :------------------------------------------- |
| `pnpm dev`        | Run every service in watch mode              |
| `pnpm build`      | Production build                             |
| `pnpm type-check` | Type-check everything                        |
| `pnpm lint`       | Lint everything                              |
| `pnpm db:setup`      | Generate clients, migrate, and seed          |
| `pnpm db:migrate` | Create a migration after a schema change     |

Full list in [docs/development.md](docs/development.md).

## License

MIT
