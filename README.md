# next-tanstack-framework-template

The company's full-stack platform template: one monorepo with a central identity app and one
application per business domain. **Next.js 15** for conventional apps, **TanStack Start** for highly
interactive ones, TanStack Query/Table/Form throughout. Built with **Better Auth** (OIDC),
**Prisma 7**, **PostgreSQL**, **RabbitMQ**, **pnpm** and **Turborepo**.

- `accounts` is the only identity provider (OAuth 2.0 / OpenID Connect).
- Every domain app signs in through it, owns its own database, and talks to other domains only
  through their APIs or events.
- `worker` runs background jobs (email today).

> **State (2026-10-07):** Consolidated into high-cohesion Bounded Contexts (D21). `accounts` (:5011)
> is the central OIDC provider; `people` (:5010) unifies HR records, recruitment pipeline, and
> attendance tracking on `people_db`; `finance` (:5013) reads employees via M2M app tokens.
> `exam` (:5016), `collaboration` (:5020), `workspace` (:5021) run on **TanStack Start**;
> `crm` (:5017), `operations` (:5018), `analytics` (:5019) on Next.js.
> For the visual system architecture and relationships, see [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md).

---

## Apps

| App                              | Framework      | URL                               | State                                                |
| :------------------------------- | :------------- | :-------------------------------- | :--------------------------------------------------- |
| `people`                         | Next.js        | http://localhost:5010             | HR, Recruitment, Attendance (`people_db`)            |
| `accounts`                       | Next.js        | http://localhost:5011             | Sign-in, sign-up, verification, reset, OIDC provider |
| `worker`                         | Node.js        | http://localhost:5012/health      | Email jobs → SMTP                                    |
| `finance`                        | Next.js        | http://localhost:5013             | Payroll & ledger (calls People API via app token)    |
| `exam`                           | TanStack Start | http://localhost:5016             | Assessments (TanStack Start reference app)           |
| `crm`, `operations`, `analytics` | Next.js        | http://localhost:5017, 5018, 5019 | Domain apps                                          |
| `collaboration`, `workspace`     | TanStack Start | http://localhost:5020, 5021       | Highly interactive domain apps                       |

Tools: Mailpit http://localhost:5004 · RabbitMQ http://localhost:5002 (guest / guest).

---

## Quick start

```bash
pnpm install
cp .env.example .env      # replace the change-me secrets
docker compose up -d      # Postgres, RabbitMQ, Mailpit
pnpm db:setup             # Prisma clients, migrations, seed
pnpm dev                  # starts all apps concurrently
```

Open any app (e.g. http://localhost:5010 for People), click **Sign in**, use `admin@example.com` / `password123`.

---

## Documentation

All in-depth documentation is organized by role and usage under [`docs/`](docs/README.md).

### 🚀 Getting Started
| Document | Read it for |
| :--- | :--- |
| [docs/getting-started/beginners-guide.md](docs/getting-started/beginners-guide.md) | **New to this project? Start here!** 60s mental model, 3 golden rules & FAQ |
| [docs/getting-started/development.md](docs/getting-started/development.md) | Local environment, scripts, making changes, debugging recipes |
| [docs/getting-started/configuration.md](docs/getting-started/configuration.md) | Complete environment variable and port reference |

### 🏛️ Architecture & System Design
| Document | Read it for |
| :--- | :--- |
| [docs/architecture/system-architecture.md](docs/architecture/system-architecture.md) | **Visual architecture map**, Mermaid sequence & ER diagrams, bounded contexts |
| [docs/architecture/decisions.md](docs/architecture/decisions.md) | Architectural decision records (ADRs D1–D21), alternatives & rationale |
| [docs/architecture/auth-flows.md](docs/architecture/auth-flows.md) | SSO, session cookies, back-channel logout, app-to-app M2M tokens |
| [docs/architecture/stack-rationale.md](docs/architecture/stack-rationale.md) | Framework per app; when TanStack Start is chosen over Next.js 15 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Core system rules, contracts, and monorepo principles |

### 🛠️ How-To Guides
| Document | Read it for |
| :--- | :--- |
| [docs/guides/adding-a-service.md](docs/guides/adding-a-service.md) | Step-by-step checklist for scaffolding a new service or API |
| [docs/guides/deployment.md](docs/guides/deployment.md) | Production checklist, Docker deployment, and scaling |

### 📜 History & Context
| Document | Read it for |
| :--- | :--- |
| [docs/history/roadmap.md](docs/history/roadmap.md) | Upcoming work (Domain Events, Outbox/Inbox pattern) |
| [docs/history/build-log.md](docs/history/build-log.md) | Engineering log, phase-by-phase verification, and gotchas |
| [docs/history/origins.md](docs/history/origins.md) | Migration history from the monolith template |
| [docs/README.md](docs/README.md) | Central documentation directory index |
| [CLAUDE.md](CLAUDE.md) | AI/Developer onboarding cheat sheet and conventions |

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

Full list: [docs/getting-started/development.md](docs/getting-started/development.md).

## License

MIT
