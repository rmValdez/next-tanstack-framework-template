# Beginner's Guide: Understanding This Project

Welcome! If you are new to this repository, this guide will give you an easy, intuitive mental model of how the platform works, the golden architectural rules, and how to get productive quickly without getting overwhelmed.

---

## 1. The 60-Second Mental Model

Imagine a company with multiple departments:
- **IT / Security** (`accounts`): Issues employee badges and verifies identities.
- **People Operations** (`people`): Manages employees, job applicants, and daily attendance.
- **Finance** (`finance`): Runs payroll and tracks company spending.
- **Learning & Training** (`exam`): Hosts staff quizzes and assessments.
- **Sales & Ops** (`crm`, `operations`): Tracks clients and business tasks.
- **Internal Collaboration** (`collaboration`, `workspace`): Realtime team chat and document notes.
- **The Mailroom** (`worker`): Sends background emails.

Instead of stuffing all these departments into one giant monolithic web app, this repository is a **modular multi-service monorepo**. Each department has its own application and its own database, but they all live in a single repository managed by **pnpm** and **Turborepo**.

---

## 2. The 3 Golden Rules (Never Break These!)

### 👑 Rule 1: Identity Lives ONLY in `accounts` (:5011)
- **No domain app ever stores passwords.** `people`, `finance`, and `crm` have zero password columns.
- When you click "Sign in" on any app, it redirects you to `accounts` via **Single Sign-On (OIDC)**.
- Once authenticated, the app creates a "shadow user" locally linked to your central account.

### 🛡️ Rule 2: Each App Strictly Owns Its Database
- `people` owns `people_db`.
- `finance` owns `finance_db`.
- **Never do cross-database SQL queries or joins!** 
- `apps/finance` is **forbidden** from importing `@workspace/people-db`. If you try to do this, **ESLint will fail your build immediately**:
  ```
  Boundary violation: apps/finance may only import its own database package (@workspace/finance-db).
  ```

### 🤝 Rule 3: Apps Talk via APIs or Events
If `Finance` needs to calculate payroll, it needs to know which employees exist. But because Rule 2 forbids Finance from reading `people_db` directly, Finance must:
1. Ask `accounts` for a secure **Machine-to-Machine (M2M) token**.
2. Call `people`'s API: `GET http://localhost:5010/api/v1/employees`.
3. `people` verifies the token and returns a clean directory list (leaving private details like HR salaries safe inside `people_db`).

---

## 3. The Applications Cheat Sheet

All apps run together concurrently when you run `pnpm dev`:

| Port | App Name | What It Does | Framework |
| :--- | :--- | :--- | :--- |
| **`:5010`** | **`people`** | **HR directory, job candidate hiring, attendance clock-ins** | Next.js 15 |
| **`:5011`** | **`accounts`** | Central identity provider (sign-in, registration, password resets) | Next.js 15 |
| **`:5012`** | **`worker`** | Background job runner (processes email queues) | Node.js |
| **`:5013`** | **`finance`** | Payroll entries & financial ledger | Next.js 15 |
| **`:5016`** | **`exam`** | Assessments and exam quizzes | TanStack Start |
| **`:5017`** | **`crm`** | Client relationship management | Next.js 15 |
| **`:5018`** | **`operations`**| Operational workflows | Next.js 15 |
| **`:5019`** | **`analytics`** | Aggregated reports and metrics | Next.js 15 |
| **`:5020`** | **`collaboration`**| Team chat & channels | TanStack Start |
| **`:5021`** | **`workspace`** | Shared notes and team workspaces | TanStack Start |
| **`:5004`** | **Mailpit** | Local development inbox that catches outgoing emails | Dev Tool |

---

## 4. Why Is It Called "People Operations" Instead of "HR"?

You might wonder: *Why is there a `people_db` and an `apps/people`, instead of separate `hr`, `recruitment`, and `attendance` apps?*

This is called a **Bounded Context** in software architecture:
- Earlier, we had 3 separate micro-apps (`apps/hr`, `apps/recruitment`, `apps/attendance`).
- But hiring someone connects all three: an applicant in **Recruitment** becomes an **Employee**, who then clocks into **Attendance** every morning.
- Putting them into 3 different databases meant that when you hired someone, you couldn't save both changes in a single database transaction!
- By consolidating them into **`apps/people`**, hiring an applicant happens **atomically**:
  ```ts
  // 100% reliable: both updates succeed together or fail together!
  await peopleDb.$transaction(async (tx) => {
    const employee = await tx.employee.create({ data: employeeData });
    await tx.candidate.update({
      where: { id: candidateId },
      data: { status: "HIRED", employeeId: employee.id }
    });
  });
  ```

---

## 5. Day-to-Day Developer Workflows

### Starting the Project
```bash
# 1. Start the databases and message broker
docker compose up -d

# 2. Setup database tables and test data (run once)
pnpm db:setup

# 3. Start all services
pnpm dev
```

### Logging In
1. Open [http://localhost:5010](http://localhost:5010) (or any app).
2. Click **"Sign in"**.
3. Use the seeded credentials:
   - **Email:** `admin@example.com`
   - **Password:** `password123`
4. You will be authenticated by `accounts` (:5011) and redirected back to your dashboard!

### Running Only One App
If you only want to work on `people` without running every service:
```bash
pnpm --filter people dev
```
*(Make sure `accounts` is also running if you need to log in!)*

### Code Quality Checks
Before committing code, always run these three commands from the root:
```bash
pnpm type-check   # Verifies TypeScript across all packages
pnpm lint         # Verifies ESLint rules and database boundaries
pnpm build        # Verifies production Next.js & TanStack builds
```

---

## 6. Project Directory Layout

```
next-betterAuth-multiservice-template/
├── apps/                         # Frontends & services
│   ├── accounts/                 # Port 5011: Central auth provider
│   ├── people/                   # Port 5010: HR, Recruitment, Attendance
│   ├── finance/                  # Port 5013: Payroll & ledger
│   ├── exam/                     # Port 5016: TanStack Start app
│   ├── worker/                   # Port 5012: Background RabbitMQ worker
│   └── ...                       # crm, operations, analytics, etc.
│
├── packages/                     # Shared packages
│   ├── accounts-db/              # Database client for accounts_db
│   ├── people-db/                # Database client for people_db
│   ├── finance-db/               # Database client for finance_db
│   ├── core/                     # Shared URLs, environment schemas, and M2M API types
│   └── ui/                       # Shared Tailwind/React UI components (buttons, cards, inputs)
│
├── docker/                       # Local Docker definitions (Postgres, RabbitMQ, Mailpit)
├── docs/                         # Grouped documentation (getting-started, architecture, guides, history)
│   ├── getting-started/          # Beginner's guide, development, configuration
│   ├── architecture/             # System architecture & Mermaid maps, ADRs, auth flows
│   ├── guides/                   # How-to recipes (adding services, deployment)
│   └── history/                  # Milestones, roadmap, and build log
├── ARCHITECTURE.md               # Core system architecture specification
└── README.md                     # Monorepo overview and quickstart
```

---

## 7. Do's and Don'ts Checklist

| ✅ DO | ❌ DON'T |
| :--- | :--- |
| **DO** import `@workspace/core/urls` to find other app ports. | **DON'T** hardcode `http://localhost:5010` in app code. |
| **DO** call `/api/v1/*` when asking another service for data. | **DON'T** import another app's `-db` package. |
| **DO** use `docker compose up -d` before starting dev servers. | **DON'T** run database migrations without Postgres running. |
| **DO** use `@workspace/ui` components for consistent styling. | **DON'T** duplicate basic buttons or card components across apps. |
| **DO** consult [System Architecture](../architecture/system-architecture.md) for data flows. | **DON'T** invent cross-database relationships outside bounded contexts. |
