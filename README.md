# PropertyFlow CRM

A property management CRM system built with a modern TypeScript monorepo stack.

## Architecture

```
apps/api/          Elysia.js backend (Bun runtime, Prisma ORM, PostgreSQL)
apps/web/          React 19 frontend (TanStack Router, TanStack Query, Tailwind CSS)
packages/shared/   Shared TypeScript types, constants, utilities
deploy/            Docker Compose production setup (Caddy, nginx, Bun, PostgreSQL)
```

### Production Stack

```
Internet
  │
  ├── :80 / :443 / :8080
  │
  ▼
Caddy (reverse proxy, TLS)
  ├── /api/*  →  Elysia.js API (:3000)
  └── /*      →  nginx serving React SPA (:80)
                     │
                     ▼
                 PostgreSQL (:5432)
```

## Getting Started

### Prerequisites

- [Node.js 22+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/)
- [Docker](https://www.docker.com/) (for PostgreSQL)

### Setup

```bash
# Clone
git clone git@github.com:cosolnergy2/thanamol-crm.git
cd thanamol-crm

# Start PostgreSQL
docker compose up -d

# Install dependencies
pnpm install

# Generate Prisma client
pnpm --filter api exec prisma generate

# Apply database migrations
pnpm --filter api exec prisma migrate dev

# Seed database
pnpm --filter api exec bun run prisma/seed.ts

# Start dev servers (API :3000, Web :5173)
pnpm dev
```

Open http://localhost:5173

**Default login:** `admin@thanamol.com` / `password123`

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers |
| `pnpm build` | Build all packages |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm --filter api dev` | Start API only |
| `pnpm --filter web dev` | Start frontend only |
| `pnpm --filter web exec playwright test` | Run E2E tests |

## Database Migrations

After changing `apps/api/prisma/schema.prisma`:

```bash
pnpm --filter api exec prisma migrate dev --name describe_change
```

This generates a migration file in `apps/api/prisma/migrations/`. Commit it with your code. Migrations auto-apply on production deploy.

## CI/CD

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| **CI** | Push to `dev`, PR to `main` | Install, build, typecheck, unit tests |
| **CD** | Push to `main` | SSH to server, pull, Docker build, migrate, deploy |

Branch protection on `main` requires CI to pass before merge.

## Git Workflow

```
main     ← production, auto-deploys on merge
 └── dev ← integration branch, CI on push
      └── feat/T-XXX-description ← topic branches
```

1. Create topic branch from `dev`
2. Develop and commit: `type(T-XXX): description`
3. Merge topic branch into `dev`
4. Create PR from `dev` → `main` (CI must pass)
5. Merge PR → auto-deploy to production

### Commit Message Format

```
type(T-XXX): description
```

Types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`

## Deployment

Production server: `ecm.thanamol.com`

See [DEPLOY.md](DEPLOY.md) for full deployment guide, server access, and operations.

## Base44 Source Repositories

This project is ported from 3 Base44 applications. When a Base44 app is updated, sync the changes into this CRM.

| Base44 App | GitHub Repo | Maps to |
|------------|-------------|---------|
| PropertyFlow CRM | `cosolnergy2/propertyflow-crm` | Core CRM: customers, leads, deals, contracts, invoices, units, projects |
| FMS | `cosolnergy2/fms` | Facility Management: assets, work orders, inventory, vendors, budgets, compliance |
| Finance | `cosolnergy2/finance` | Accounting: chart of accounts, journal entries, banking, tax, AP, fixed assets |

### Sync Workflow

When a Base44 source app is updated:

```
Base44 App (updated)
  │
  ▼  clone/pull latest
/tmp/<app>-repo
  │
  ▼  compare pages, components, entities
thanamol-crm (dev branch)
  │
  ▼  implement changes following CRM patterns
  │   - Prisma models (not Base44 entities)
  │   - Elysia.js API routes (not Base44 SDK)
  │   - TanStack Router pages (not React Router)
  │   - TanStack Query hooks (not Base44 client)
  │
  ▼  PR dev → main → auto-deploy
Production
```

**Steps to sync:**

1. Clone the updated Base44 repo:
   ```bash
   GIT_SSH_COMMAND="ssh" git clone git@github-solnergy:cosolnergy2/<repo>.git /tmp/<repo>
   ```

2. Compare pages in `/tmp/<repo>/src/pages/` against existing CRM pages

3. For new/changed features, implement in CRM following existing patterns:
   - **Schema:** Add Prisma models in `apps/api/prisma/schema.prisma`, run `prisma migrate dev`
   - **Types:** Add shared types in `packages/shared/src/types/index.ts`
   - **API:** Create Elysia routes in `apps/api/src/routes/`, register in `index.ts`
   - **Hooks:** Create TanStack Query hooks in `apps/web/src/hooks/`
   - **Pages:** Create TanStack Router pages in `apps/web/src/routes/_authenticated/`
   - **Nav:** Update sidebar in `apps/web/src/components/layout/Sidebar.tsx`

4. Build, test, commit, push, PR to main

## Tech Stack

- **Runtime:** [Bun](https://bun.sh/) (API), [Node.js](https://nodejs.org/) (build)
- **API:** [Elysia.js](https://elysiajs.com/) with [Prisma ORM](https://www.prisma.io/)
- **Frontend:** [React 19](https://react.dev/) + [TanStack Router](https://tanstack.com/router) + [TanStack Query](https://tanstack.com/query)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- **Database:** [PostgreSQL 17](https://www.postgresql.org/)
- **Testing:** [Vitest](https://vitest.dev/) (unit), [Playwright](https://playwright.dev/) (E2E)
- **CI/CD:** [GitHub Actions](https://github.com/features/actions)
- **Deploy:** [Docker Compose](https://docs.docker.com/compose/) + [Caddy](https://caddyserver.com/)
