<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->


## Branching: Continuous Staging and On-Demand Main Synchronization

> This section takes precedence over any other branch or pull-request-target instruction in this file.
> `main` is this repository's production branch.

The development workflow is continuous and is not restricted to a daily schedule, a single task, or a fixed number of tasks.

- Before beginning a new development cycle, inspect the relationship between `main` and `staging` and synchronize them when necessary.
- All task branches must originate from the latest `staging`.
- Completed tasks must be submitted through PRs targeting `staging`.
- Developers may continue starting and completing additional tasks for as long as needed.
- Do not synchronize `staging` into `main` automatically after each task, after a fixed time interval, or simply because the day has ended.
- Synchronize `staging` into `main` only when the team explicitly decides that the accumulated changes are ready for delivery.
- Before synchronization, validate the combined changes and complete all required reviews and checks.
- Never merge unfinished or known-broken changes into `main`.
- After synchronization, verify the resulting branch state before continuing.
- **When a task is done, ask the user (the repository owner) whether it is all good.** The owner decides whether it merges and when `staging` is synchronized; an agent's own judgment is not approval.

**Workflow:** Establish baseline → Develop tasks → Merge completed tasks into staging → Continue working or synchronize to main when ready → Repeat.

`staging` is the continuous integration branch. `main` is updated on demand when the team chooses to deliver the accumulated changes.

```bash
# Start a task
git fetch origin
git log --oneline origin/main..origin/staging   # what staging has that main doesn't
git checkout staging && git pull
git checkout -b <type>/<short-description>      # feat/, fix/, docs/, test/, chore/ ...

# Finish a task: open a PR into staging (never into main)
gh pr create --base staging

# Deliver (only when the owner decides): one PR from staging into main
gh pr create --base main --head staging
```

## Git & GitHub Pull Request Workflow

### 1. Inspect Before Editing
- Run git status --short --branch, git branch --show-current, and git diff before modifying files.
- Check for uncommitted changes and verify whether they belong to your task.
- Never discard, reset, clean, stash, or silently relocate existing uncommitted work without explicit authorization.

### 2. Dedicated Task Branches Are Mandatory
- Never implement changes or commit directly on main, master, or a protected/shared integration branch.
- Create or switch to a dedicated branch before making changes:
  - eat/<short-description> - new features
  - ix/<short-description> - bug fixes
  - perf/<short-description> - performance improvements
  - 
efactor/<short-description> - code refactoring
  - docs/<short-description> - documentation updates
  - 	est/<short-description> - test additions or fixes
  - chore/<short-description> - tooling and dependencies

### 3. Staging and Secret Safety
- Stage only intended files. Never use blind git add . or git add -A without inspecting git diff --cached.
- Never commit .env, credentials, tokens, secret keys, or local build/cache artifacts.
- Keep pull requests focused, cohesive, and limited to the requested scope.

### 4. Verification Before Declaring Readiness
- Always run the repository's verification checks (tests, linter, type-check) before claiming work is complete.
- Never claim tests passed or checks succeeded without running them and inspecting the output.

### 5. Conventional Commits
- Use standard conventional commit format: <type>(<scope>): <imperative summary>
- Examples:
  - eat(auth): add session revocation endpoint
  - ix(routing): prevent race condition on route change
  - 	est(unit): add coverage for freshness classifier

### 6. Mandatory Completion Report
At the end of every task or PR preparation, provide a structured completion report:
- **Branch**: Dedicated branch used.
- **Changes**: Bulleted summary of implemented changes.
- **Files**: Key files created, modified, or removed.
- **Verification**: Exact test, lint, and build commands executed and their results.
- **Git Status**: Clean working tree confirmation and commit hash if committed.
- **Risks & Follow-ups**: Any open caveats, skipped checks, or remaining tasks.

