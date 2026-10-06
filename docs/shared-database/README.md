# Shared Database Variant

A supported alternative to the template's default of one database per service. Use it for a
platform whose domains are tightly coupled (for example HR, finance, attendance, recruitment, exam),
where separate databases would force every join through APIs or events.

> **Status:** architecture verified by a spike on 2026-10-06 (Prisma 7.10.0, Postgres 16). See
> [spike-results.md](spike-results.md). Not used by the template itself; the template stays on
> separate databases ([D2](../decisions.md#d2-one-database-per-service)).
> Decision: [D13](../decisions.md#d13-shared-database-variant-with-schema-ownership).

| File | Contents |
| :--- | :--- |
| [README.md](README.md) | When to use it, architecture, rules |
| [setup.md](setup.md) | Step-by-step recipe: SQL, roles, Prisma config, views, migrations |
| [spike-results.md](spike-results.md) | What was tested, results, gotchas found |

---

## The core idea

**Every service owns its data. Physical database separation is optional.**

Ownership means "only the owner writes it", and Postgres enforces that with schemas and roles, not
with code review. Domains can share one database without sharing tables.

---

## Architecture

```
                 accounts (Next.js)  ── accounts_db (always separate: passwords, sessions, client secrets)
                        │ OIDC
      ┌─────────┬───────┼──────────┬─────────────┐
      hr     finance  attendance  recruitment   exam      (apps; how many is a separate decision)
      │         │         │           │           │
      └─────────┴─────────┼───────────┴───────────┘
                          ▼
                     company_db (one Postgres database)
  ┌────────────┬────────────┬─────────────┬───────────────┬──────────┐
  │ hr         │ finance    │ attendance  │ recruitment   │ exam     │  private: only the owner role
  ├────────────┼────────────┼─────────────┼───────────────┼──────────┤
  │ hr_public  │            │ att_public  │               │          │  published read-only views
  └────────────┴────────────┴─────────────┴───────────────┴──────────┘
```

Application boundaries and data boundaries don't have to match. Five domains can be served by fewer
apps, for example a staff `portal` (HR, finance, attendance) and an applicant-facing `careers`
(recruitment, exam). Decide the app split from users and workflows, not from the schema list.

---

## Rules

| Rule | Enforced by |
| :--- | :--- |
| An app writes only its own schema | Schema ownership + role grants |
| Other apps read only published views | `<domain>_public` schemas + `GRANT SELECT` |
| Published views are a versioned API | Names end in `_v1`; additive changes only, breaking → `_v2` |
| No foreign keys across owners | Plain ID columns (`employee_id TEXT`) |
| Each domain migrates only its own schema | One Prisma package per domain, `?schema=<domain>` |
| Cross-domain writes go through the owner | Owner's HTTP API or a RabbitMQ domain event |
| Identity data is isolated | `accounts_db` is a separate database |
| Migrations and runtime use different roles (production) | `<domain>_migrator` (DDL) vs `<domain>_app` (DML only) |

### Cross-domain writes

```
recruitment: applicant hired
      │ publish "recruitment.applicant.hired" { applicantId, name, positionId }
      ▼
  RabbitMQ
      ▼
hr consumer → hrDb.employee.create(...)        ← only HR writes employees
```

Never: recruitment imports `hr-db` and inserts into `hr.employees`.

---

## Why not just share tables

This is the failure mode in philgeps-workspace, where apps import each other's database packages:

| App / package | Imports |
| :--- | :--- |
| `philgeps` | `philgeps-db` + `accounts-db` |
| `marketplace` | `marketplace-db` + `philgeps-db` + `accounts-db` |
| `core` | all three database packages |

Once any app can write any table, a schema change in one domain can break every other app, and no
domain can be moved out later. The schema-and-role setup keeps the convenience of one database while
making that coupling impossible.

---

## Moving a domain out later

Because no other domain writes its tables and readers only use its published views, a domain can
move to its own database later: copy its schema, then replace the views its consumers read with an
API or replicated tables. Consumers keep reading the same contract.
