# Shared Database Spike Results

A disposable test run on 2026-10-06 to check the [shared database variant](README.md) against real
Prisma and Postgres behavior before documenting it. The resulting recipe is in [setup.md](setup.md).

| | |
| :--- | :--- |
| Prisma | 7.10.0 (`prisma`, `@prisma/client`, `@prisma/adapter-pg`) |
| Postgres | 16 (alpine), throwaway container |
| Layout | `company_db` with schemas `hr`, `hr_public`, `finance`; roles `hr_app`, `finance_app` |
| Packages | `hr-db` (owns `employees`, publishes `employee_directory_v1`), `finance-db` (owns `payroll`, reads the view) |

---

## Results

| Test | Result | Notes |
| :--- | :--- | :--- |
| HR migration with a restricted role | ✅ after fix | Needs `GRANT CREATE ON DATABASE` (gotcha A) |
| Shadow database handling | ✅ after fix | Needs a per-domain shadow DB with `?schema=` (gotcha B) |
| HR-owned view migration | ✅ | Hand-written SQL in a `--create-only` migration |
| Finance migration listing `hr_public` | ✅ | Generated SQL creates only `finance.payroll`; nothing for `hr_public` |
| Finance reads the published view | ✅ | `financeDb.employeeDirectory.findMany()` |
| Finance cannot read or write `hr.*` | ✅ | `permission denied for schema hr` (SELECT and UPDATE) |
| Finance cannot write through the view | ✅ | `permission denied for view employee_directory_v1` |
| Finance cannot create objects in `hr_public` | ✅ | `permission denied for schema hr_public` |
| HR cannot read `finance.*` | ✅ | `permission denied for schema finance` |
| HR creates and updates its own rows | ✅ | |
| Separate migration histories | ✅ | `hr._prisma_migrations`: 2, `finance._prisma_migrations`: 1 |
| Repeat `migrate dev` / drift | ✅ | Both packages: "Already in sync" and `migrate status` clean |
| Cross-domain ID without FK | ✅ | `payroll.employee_id` holds HR's ID |
| View locks the columns it uses | ✅ confirmed | `ALTER COLUMN` on `full_name` blocked while the view exists |

---

## Gotchas found

### A. `CREATE SCHEMA IF NOT EXISTS` needs database-level `CREATE`

Prisma's first migration for a schema starts with `CREATE SCHEMA IF NOT EXISTS "hr"`. Postgres checks
`CREATE` on the database before checking whether the schema exists, so it fails even though `hr`
was already created and owned by `hr_app`:

```
P3018  ERROR: permission denied for database company_db
```

**Fix:** `GRANT CREATE ON DATABASE company_db TO <domain>_app`. **Side effect:** the role can now
create new schemas (verified: `finance_app` created a `rogue` schema and a table in it). It still
can't touch other domains. For production, split migrator and runtime roles
([setup.md](setup.md#production-split-migrator-and-runtime-roles-untested)).

### B. Shadow database

`prisma migrate dev` creates a temporary shadow database by default, and a restricted role can't:

```
P3014  Prisma Migrate could not create the shadow database ... permission denied to create database
```

**Fix:** a dedicated shadow database per domain, owned by its role, set as `shadowDatabaseUrl`.
The URL needs `?schema=<domain>`. Without it, the shadow replay put `employees` in the shadow
database's `public` schema, which Prisma doesn't reset because it isn't listed, and the next run
failed with `relation "employees" already exists`.

### C. Listing a schema you don't own: not a problem

The expected risk was that `schemas = ["finance", "hr_public"]` would make Prisma Migrate try to
manage `hr_public`. It didn't. No `CREATE SCHEMA "hr_public"`, no view DDL, no drift reported, and
the view model generated a working read-only client. No workaround (second generator, separate
client) is needed.

---

## Not tested

- Split `<domain>_migrator` / `<domain>_app` roles in production.
- `prisma migrate deploy` in CI (only `migrate dev` was run).
- Better Auth tables (`user`, `session`, `account`, `verification`) inside a domain schema, for
  example `hr_auth`.
- More than two domains, or a domain consuming views from several others.
