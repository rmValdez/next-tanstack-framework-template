# Shared Database Setup

Recipe for the [shared database variant](README.md), using `hr` (owns employees, publishes a view)
and `finance` (owns payroll, reads the view) as the example. Every step here was run in the
[spike](spike-results.md) unless marked **untested**.

---

## 1. Databases, schemas, roles

```sql
-- docker/postgres/init.sql (development only: passwords are placeholders)
CREATE DATABASE accounts_db;
CREATE DATABASE company_db;

-- Shadow databases for `prisma migrate dev`, one per domain, owned by its role
CREATE ROLE hr_app      LOGIN PASSWORD 'hr_pw';       -- dev only
CREATE ROLE finance_app LOGIN PASSWORD 'finance_pw';  -- dev only
CREATE DATABASE hr_shadow      OWNER hr_app;
CREATE DATABASE finance_shadow OWNER finance_app;

\c company_db

CREATE SCHEMA hr        AUTHORIZATION hr_app;
CREATE SCHEMA hr_public AUTHORIZATION hr_app;   -- HR decides what others can see
CREATE SCHEMA finance   AUTHORIZATION finance_app;

-- Nobody uses public; nobody creates schemas by default
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON DATABASE company_db FROM PUBLIC;

-- Prisma migrations run `CREATE SCHEMA IF NOT EXISTS "<schema>"`, and Postgres checks this
-- privilege even when the schema already exists
GRANT CREATE ON DATABASE company_db TO hr_app, finance_app;

-- Finance may read HR's published views, nothing else
GRANT USAGE ON SCHEMA hr_public TO finance_app;
ALTER DEFAULT PRIVILEGES FOR ROLE hr_app IN SCHEMA hr_public
  GRANT SELECT ON TABLES TO finance_app;
```

`ALTER DEFAULT PRIVILEGES` means every view HR adds to `hr_public` later is readable by finance
without another grant.

### Production: split migrator and runtime roles (**untested**)

`CREATE ON DATABASE` lets a role create *new* schemas (the spike created a `rogue` schema as
`finance_app`). It can't touch other domains, but runtime code shouldn't have DDL rights at all.
In production use two roles per domain:

| Role | Owns schema | `CREATE ON DATABASE` | Used by |
| :--- | :--- | :--- | :--- |
| `hr_migrator` | yes | yes | `prisma migrate deploy` in CI/deploy |
| `hr_app` | no | no | The running app: `SELECT/INSERT/UPDATE/DELETE` on `hr` tables |

Grant `hr_app` its DML through `ALTER DEFAULT PRIVILEGES FOR ROLE hr_migrator IN SCHEMA hr`. Passwords
come from the deployment's secret store, never from `init.sql`.

---

## 2. Connection strings

```env
HR_DATABASE_URL=postgresql://hr_app:hr_pw@localhost:5000/company_db?schema=hr
HR_SHADOW_DATABASE_URL=postgresql://hr_app:hr_pw@localhost:5000/hr_shadow?schema=hr

FINANCE_DATABASE_URL=postgresql://finance_app:finance_pw@localhost:5000/company_db?schema=finance
FINANCE_SHADOW_DATABASE_URL=postgresql://finance_app:finance_pw@localhost:5000/finance_shadow?schema=finance
```

- `?schema=` puts each domain's `_prisma_migrations` in its own schema, so histories never collide.
- The shadow URL **must** have `?schema=` too. Without it, Prisma's unqualified `CREATE TABLE` lands
  in the shadow database's `public` schema, Prisma doesn't reset `public` (it isn't listed), and
  the next `migrate dev` fails with `relation "…" already exists`.

---

## 3. Owner package: `packages/hr-db`

```ts
// prisma.config.ts
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.HR_DATABASE_URL,
    shadowDatabaseUrl: process.env.HR_SHADOW_DATABASE_URL,
  },
});
```

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client"
  output   = "./generated"
}

datasource db {
  provider = "postgresql"
  schemas  = ["hr"]          // hr_public is NOT listed: its views are hand-written SQL
}

model Employee {
  id         String  @id @default(cuid())
  employeeNo String  @unique @map("employee_no")
  fullName   String  @map("full_name")
  salary     Decimal                       // private, not in the published view
  status     String
  @@map("employees")
  @@schema("hr")
}
```

### Publishing a view

Prisma Migrate does not create views (the `views` feature is still Preview in Prisma 7), so they go
in a hand-written migration:

```sh
pnpm prisma migrate dev --create-only --name public_views
```

```sql
-- prisma/migrations/<timestamp>_public_views/migration.sql
-- Published read API for other domains. Additive changes only; breaking => _v2.
CREATE SCHEMA IF NOT EXISTS "hr_public";   -- needed so the shadow database replay works
CREATE VIEW hr_public.employee_directory_v1 AS
SELECT id, employee_no, full_name, status FROM hr.employees;
```

```sh
pnpm prisma migrate dev     # applies it; later runs report "Already in sync"
```

### Changing a column the view uses

Postgres blocks it:

```
ERROR: cannot alter type of a column used by a view or rule
DETAIL: rule _RETURN on view hr_public.employee_directory_v1 depends on column "full_name"
```

So a migration that changes such a column must drop the view, alter the table, and recreate the view
with the same columns and types, all in one migration file. If the published shape has to change,
create `employee_directory_v2` next to `v1` and drop `v1` only after every consumer has moved.

---

## 4. Consumer package: `packages/finance-db`

```prisma
generator client {
  provider        = "prisma-client"
  output          = "./generated"
  previewFeatures = ["views"]
}

datasource db {
  provider = "postgresql"
  schemas  = ["finance", "hr_public"]   // hr_public only for reading the view
}

model Payroll {
  id         String  @id @default(cuid())
  employeeId String  @map("employee_id")  // HR's ID, no foreign key across owners
  grossPay   Decimal @map("gross_pay")
  @@map("payroll")
  @@schema("finance")
}

view EmployeeDirectory {
  id         String @unique
  employeeNo String @map("employee_no")
  fullName   String @map("full_name")
  status     String
  @@map("employee_directory_v1")
  @@schema("hr_public")
}
```

Listing a schema the package doesn't own is fine: the generated migration only creates
`finance.payroll`. It emits nothing for `hr_public` and no view DDL, and `migrate status` reports no
drift.

```ts
await financeDb.employeeDirectory.findMany();                       // works
await financeDb.payroll.create({ data: { employeeId, grossPay } }); // works
await financeDb.$executeRaw`UPDATE hr.employees SET salary = 0`;    // permission denied for schema hr
```

---

## 5. Checklist for a new domain

1. `init.sql`: role, shadow database, schema(s), `CREATE ON DATABASE`, read grants on the
   `_public` schemas it consumes.
2. `.env`: `<DOMAIN>_DATABASE_URL` and `<DOMAIN>_SHADOW_DATABASE_URL`, both with `?schema=`.
3. `packages/<domain>-db`: `prisma.config.ts`, schema with `schemas = [own, ...consumed _public]`,
   every model tagged `@@schema(...)`.
4. Views it publishes: hand-written migration, `_v1` names.
5. Cross-domain writes: a RabbitMQ event type in `packages/core/src/queue/types.ts` or an owner API,
   never an import of another domain's `-db` package.
