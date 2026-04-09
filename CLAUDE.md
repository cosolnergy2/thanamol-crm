# thanamol-crm

Thanamol CRM — a property management CRM system.

## Project Structure

- `apps/api/` — Elysia.js backend (Bun runtime, Prisma ORM, PostgreSQL)
- `apps/web/` — React 19 frontend (TanStack Router, TanStack Query, Tailwind CSS)
- `packages/shared/` — Shared TypeScript types, constants, utilities
- `deploy/` — Docker configs, Caddyfile, deploy script, production env

## Commands

- `pnpm install` — Install dependencies
- `pnpm build` — Build all packages
- `pnpm dev` — Start all dev servers
- `pnpm test` — Run unit tests (Vitest)
- `pnpm --filter api dev` — Start API dev server
- `pnpm --filter web dev` — Start frontend dev server
- `pnpm --filter web exec playwright test` — Run E2E tests

## Database Migrations

- Use `prisma migrate` — NOT `prisma db push`
- To create a migration after changing `schema.prisma`:
  ```
  pnpm --filter api exec prisma migrate dev --name describe_change
  ```
- Migrations auto-apply on deploy via `prisma migrate deploy`
- Migration files live in `apps/api/prisma/migrations/`
- Never manually edit the `_prisma_migrations` table

## CI/CD

- **CI** (`.github/workflows/ci.yml`): Runs on push to `dev` and PRs to `main`. Checks: install, prisma generate, build, test.
- **CD** (`.github/workflows/deploy.yml`): Runs on push to `main`. SSHs into production server, pulls code, rebuilds Docker containers, runs migrations, health check.
- Branch protection on `main` requires CI to pass before merge.

## Deployment

- **Server:** `ecm.thanamol.com` (VirtualBox, Docker Compose)
- **Stack:** Caddy (reverse proxy) → nginx (SPA) + Bun/Elysia (API) + PostgreSQL
- **Ports:** 80, 443, 8080
- **Deploy flow:** Push to `main` → GitHub Actions → SSH → `git pull` → `docker compose build` → `docker compose up -d`
- **File uploads:** Stored locally in `apps/api/uploads/`, served via Elysia static plugin at `/uploads/`
- See `DEPLOY.md` for full operations guide

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
main          (production-ready, protected, auto-deploys)
 └── dev      (integration branch, CI checks on push)
      ├── feat/T-001-property-listing
      ├── fix/T-003-price-validation
      └── test/T-004-e2e-dashboard
```

### Branch Rules
- `main` — production-ready code only. Merges come from `dev` via PR. CI must pass. Auto-deploys on merge.
- `dev` — integration branch. All topic branches merge here. CI runs on every push.
- Topic branches — created per task from `dev`, named `type/T-XXX-short-description`.

### Branch Naming
- `feat/T-XXX-description` — new feature
- `fix/T-XXX-description` — bug fix
- `test/T-XXX-description` — test additions
- `refactor/T-XXX-description` — code restructuring
- `chore/T-XXX-description` — tooling, config, dependencies

### Workflow (MANDATORY for all work)

**Step 1 — Start: always branch from `dev`**
```bash
git checkout dev && git pull origin dev && git checkout -b type/T-XXX-description
```
- EVERY task, feature, fix, or change MUST start from a topic branch off `dev`.
- NEVER work directly on `main` or `dev`.

**Step 2 — Work: commit on the topic branch**
- Commit with message format: `type(T-XXX): description`
- Push the topic branch: `git push -u origin type/T-XXX-description`

**Step 3 — User approval: merge to `dev`**
- When work is complete, ask the user: "Ready to merge to dev and create PR to main?"
- Only proceed when user confirms.

**Step 4 — Merge to `dev` (auto after approval)**
```bash
git checkout dev && git pull origin dev && git merge type/T-XXX-description && git push origin dev
```

**Step 5 — PR to `main` (auto after merge to `dev`)**
- Immediately create a PR from `dev` → `main` using `gh pr create`.
- PR title: the task description or a summary of changes.
- CI must pass before merge.

**Steps 4 and 5 happen automatically in sequence once the user says OK.** Do not ask for separate confirmation for each step.

### Commit Messages
- Format: `type(T-XXX): description`
- Types: feat, fix, test, refactor, docs, chore
- Each task gets commits referencing its task ID

### Rules for All Agents and Users
- NEVER commit directly to `main` or `dev`
- Always work on a topic branch created from `dev`
- Before starting work: `git checkout dev && git pull origin dev && git checkout -b type/T-XXX-description`
- Before reporting done: verify commits are on the topic branch, not detached HEAD
- When user approves: merge to `dev` → push `dev` → create PR `dev` → `main` (all automatic)
