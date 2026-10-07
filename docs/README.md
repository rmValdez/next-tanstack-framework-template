# Documentation Index

Welcome to the documentation for `next-tanstack-framework-template`. All documentation is organized into focused categories below.

---

## 🚀 1. Getting Started
*Start here if you are new to the codebase or setting up your local environment.*

- [**Beginner's Guide**](getting-started/beginners-guide.md): The 60-second mental model, 3 golden rules, bounded context rationale, and developer FAQ.
- [**Development & Local Setup**](getting-started/development.md): Requirements, first-run instructions, day-to-day commands, and debugging recipes.
- [**Configuration & Ports**](getting-started/configuration.md): Complete list of environment variables, port mappings, and `.env` loading behavior.

---

## 🏛️ 2. Architecture & Design
*Read these to understand how services communicate, data isolation, and security contracts.*

- [**System Architecture & Relationships**](architecture/system-architecture.md): Visual Mermaid diagrams showing cross-app flows, database isolation, and atomic transaction boundaries.
- [**Architectural Decisions (ADRs)**](architecture/decisions.md): Comprehensive records of every architectural decision (D1–D21), alternatives considered, and rationale.
- [**Authentication & SSO Flows**](architecture/auth-flows.md): Deep dive into Better Auth OIDC, Single Sign-On (SSO), Back-Channel Global Logout (D19), and Machine-to-Machine app tokens (D18).
- [**Technology Stack Rationale**](architecture/stack-rationale.md): Why Next.js 15 is used for standard domains, and when TanStack Start is chosen for highly interactive apps.

---

## 🛠️ 3. How-To Guides
*Actionable step-by-step procedures for extending the platform.*

- [**Adding a New Service**](guides/adding-a-service.md): Complete checklist for creating a new Next.js or TanStack Start bounded context, registering OAuth credentials, and provisioning databases.
- [**Production Deployment**](guides/deployment.md): Deployment checklist, security recommendations, and production Docker guidelines.

---

## 📜 4. Project History & Milestones
*Chronological milestones, roadmap, and design evolution.*

- [**Roadmap**](history/roadmap.md): Milestone progress and upcoming deliverables (e.g. RabbitMQ Domain Events).
- [**Build Log**](history/build-log.md): Historical diary of implementation steps, verification tests, and technical gotchas found along the way.
- [**Origins & Ancestry**](history/origins.md): Historical notes on concepts inherited from previous architectures.
