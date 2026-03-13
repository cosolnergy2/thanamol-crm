# thanamol-crm

PropertyFlow CRM — a property management CRM system.

## Project Structure

- `apps/api/` — Elysia.js backend (Bun runtime, Prisma ORM, PostgreSQL)
- `apps/web/` — React 19 frontend (TanStack Router, TanStack Query, Tailwind CSS)
- `packages/shared/` — Shared TypeScript types, constants, utilities

## Commands

- `pnpm install` — Install dependencies
- `pnpm build` — Build all packages
- `pnpm dev` — Start all dev servers
- `pnpm test` — Run unit tests (Vitest)
- `pnpm --filter api dev` — Start API dev server
- `pnpm --filter web dev` — Start frontend dev server
- `pnpm --filter web exec playwright test` — Run E2E tests

## Task Management

- Tasks tracked in `tasks.csv` (ID, Title, Assignee, Status, Detail)
- Task details in `tasks/T-XXX.md`
- Status flow: Draft -> Approved -> Ready to Dev -> In Progress -> Ready to Test -> Testing -> Test Pass / Test Failed -> Done
- Only ba-pm agent edits `tasks.csv` to avoid merge conflicts

## Code Standards

- Elysia uses Box type system (`t.Object()`) for validation — NOT Zod
- TanStack Router with file-based routing — NOT React Router
- No hardcoded values. Use constants, env vars, or design tokens.
- Functions do one thing. Split if doing more.
- Design system: indigo/teal palette via Tailwind tokens. No arbitrary colors.
- All shared types in `packages/shared/src/types/`
- Write code that conveys itself — avoid unnecessary comments

## Agent Workflow

- All task coordination goes through the ba-pm agent
- Dev and tester agents never communicate directly
- Agents MUST commit code and verify builds/tests pass before reporting tasks complete
- Run `git log` and `git diff` to verify work is committed before accepting completion

## Git Strategy

```
main          (production-ready, protected)
 └── dev      (integration branch, all features merge here first)
      ├── feat/T-001-property-listing
      ├── feat/T-002-auth-flow
      ├── fix/T-003-price-validation
      └── test/T-004-e2e-dashboard
```

### Branch Rules
- `main` — production-ready code only. Merges come from `dev` after all tasks pass.
- `dev` — integration branch. All topic branches merge here via PR.
- Topic branches — created per task from `dev`, named `type/T-XXX-short-description`.

### Branch Naming
- `feat/T-XXX-description` — new feature
- `fix/T-XXX-description` — bug fix
- `test/T-XXX-description` — test additions
- `refactor/T-XXX-description` — code restructuring
- `chore/T-XXX-description` — tooling, config, dependencies

### Workflow
1. Dev creates topic branch from `dev`: `git checkout dev && git checkout -b feat/T-XXX-description`
2. Dev commits work on topic branch with message: `type(T-XXX): description`
3. Tester commits E2E tests on the same topic branch
4. When task is Done, ba-pm merges topic branch into `dev` via: `git checkout dev && git merge feat/T-XXX-description`
5. When a set of features is stable on `dev`, ba-pm merges `dev` into `main`

### Commit Messages
- Format: `type(T-XXX): description`
- Types: feat, fix, test, refactor, docs, chore
- Each task gets commits referencing its task ID

### Rules for Agents
- NEVER commit directly to `main` or `dev`
- Always work on a topic branch
- Before starting work: `git checkout dev && git pull && git checkout -b type/T-XXX-description`
- Before reporting done: verify commits are on the topic branch, not detached HEAD
