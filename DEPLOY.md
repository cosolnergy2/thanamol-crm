# Deployment Guide — PropertyFlow CRM

## Architecture

```
                    ┌──────────────────────────────────────────┐
                    │             Production Server            │
                    │         ecm.thanamol.com (VirtualBox)    │
                    │                                          │
  HTTP :80 ────────►│  ┌───────────┐                           │
  HTTPS :443 ──────►│  │   Caddy   │ /api/* ──► API  (:3000)  │
  Alt :8080 ───────►│  │ (reverse  │ /*     ──► Web  (:80)    │
                    │  │  proxy)   │                           │
                    │  └───────────┘                           │
                    │        │                                  │
                    │  ┌─────┴──────┐     ┌──────────────┐     │
                    │  │  Web       │     │   API         │     │
                    │  │  (nginx)   │     │   (Bun)       │     │
                    │  │  React SPA │     │   Elysia.js   │     │
                    │  └────────────┘     └──────┬───────┘     │
                    │                            │              │
                    │                     ┌──────┴───────┐     │
                    │                     │  PostgreSQL   │     │
                    │                     │  :5432        │     │
                    │                     └──────────────┘     │
                    └──────────────────────────────────────────┘
```

### Containers

| Service    | Image              | Port | Role                              |
|------------|--------------------| -----|-----------------------------------|
| `caddy`    | caddy:2-alpine     | 80, 443, 8080 | Reverse proxy, TLS termination |
| `web`      | nginx:alpine       | 80 (internal) | Serves React SPA static files    |
| `api`      | oven/bun:1.3       | 3000 (internal) | Elysia.js API + Prisma ORM     |
| `postgres` | postgres:17        | 5432 (internal) | Database                       |

## Server Access

| Protocol | Host                  | Port | Credentials              |
|----------|-----------------------|------|--------------------------|
| SSH      | ecm.thanamol.com      | 423  | `vboxuser` / `changeme`  |
| SSH      | ecm.thanamol.com      | 423  | `root` / `p@ssw0rd`      |
| HTTP     | ecm.thanamol.com      | 8080 | —                        |
| HTTPS    | ecm.thanamol.com      | 443  | —                        |

**App login:** `admin@thanamol.com` / `password123`

## Prerequisites

The production server needs:
- Docker Engine 24+
- Docker Compose v2
- Git

## Directory Structure

```
/opt/thanamol-crm/              # App root on server
├── deploy/
│   ├── docker-compose.prod.yml # Production compose file
│   ├── Dockerfile.api          # API multi-stage build
│   ├── Dockerfile.web          # Web multi-stage build
│   ├── Caddyfile               # Reverse proxy config
│   ├── nginx.conf              # SPA routing config
│   ├── deploy.sh               # Automated deploy script
│   └── .env.prod               # Environment variables
├── apps/
│   ├── api/                    # Elysia.js backend
│   └── web/                    # React frontend
└── packages/
    └── shared/                 # Shared types
```

## Deploy

### Option 1: Automated (deploy.sh)

SSH into the server and run:

```bash
ssh -p 423 vboxuser@ecm.thanamol.com

# First time — clone the repo
cd /opt
sudo git clone <repo-url> thanamol-crm
cd thanamol-crm

# Run deploy
bash deploy/deploy.sh
```

The script will:
1. Pull latest `main` branch
2. Build all Docker containers (no cache)
3. Run `prisma db push` to apply schema
4. Seed the database (idempotent)
5. Start all services

### Option 2: Manual

SSH into the server:

```bash
ssh -p 423 vboxuser@ecm.thanamol.com
cd /opt/thanamol-crm

# Pull latest code
git checkout main
git pull

# Build and restart
cd deploy
sudo docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache
sudo docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

## Environment Variables

File: `deploy/.env.prod`

| Variable       | Description                    | Default                          |
|----------------|--------------------------------|----------------------------------|
| `DB_PASSWORD`  | PostgreSQL password            | `thanamol_prod_2026`             |
| `JWT_SECRET`   | JWT signing secret (32+ chars) | `propertyflow_crm_jwt_secret_...`|
| `VITE_API_URL` | API URL for frontend           | `/api`                           |

> **Security:** Change `DB_PASSWORD` and `JWT_SECRET` in production. The `.env.prod` file is gitignored in real deployments.

## Operations

### View logs

```bash
cd /opt/thanamol-crm/deploy

# All services
sudo docker compose -f docker-compose.prod.yml logs -f

# Specific service
sudo docker compose -f docker-compose.prod.yml logs -f api
sudo docker compose -f docker-compose.prod.yml logs -f web
sudo docker compose -f docker-compose.prod.yml logs -f postgres
```

### Check health

```bash
curl http://localhost:3000/api/health     # from server
curl http://ecm.thanamol.com:8080/api/health  # from network
```

### Restart services

```bash
cd /opt/thanamol-crm/deploy

# Restart all
sudo docker compose -f docker-compose.prod.yml restart

# Restart single service
sudo docker compose -f docker-compose.prod.yml restart api
```

### Stop all services

```bash
cd /opt/thanamol-crm/deploy
sudo docker compose -f docker-compose.prod.yml down
```

### Database access

```bash
# Connect via docker
sudo docker compose -f docker-compose.prod.yml exec postgres \
  psql -U thanamol -d thanamol_crm

# Backup
sudo docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U thanamol thanamol_crm > backup_$(date +%Y%m%d).sql

# Restore
cat backup.sql | sudo docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U thanamol -d thanamol_crm
```

### Re-seed database

```bash
sudo docker compose -f docker-compose.prod.yml exec api \
  bun run prisma/seed.ts
```

### Apply schema changes

Schema changes are applied automatically on container start via `prisma db push`. To run manually:

```bash
sudo docker compose -f docker-compose.prod.yml exec api \
  bunx prisma db push --url "$DATABASE_URL"
```

## How the Build Works

### API (Dockerfile.api)
1. **deps stage** — Node 22 Alpine, installs pnpm, runs `pnpm install`, generates Prisma client
2. **runtime stage** — Bun 1.3, copies built app, runs startup script that:
   - Pushes schema to database (`prisma db push`)
   - Seeds data (idempotent, skips on failure)
   - Starts API server on port 3000

### Web (Dockerfile.web)
1. **builder stage** — Node 22 Alpine, installs deps, builds shared package, builds React SPA with Vite
2. **runtime stage** — nginx Alpine, serves static files with SPA fallback routing

### Caddy (reverse proxy)
- Routes `/api/*` to the API container on port 3000
- Routes everything else to the Web container on port 80
- Listens on ports 80, 443, and 8080

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Site unreachable | `sudo docker compose -f docker-compose.prod.yml ps` — all containers should be `Up` |
| API 500 errors | `sudo docker compose -f docker-compose.prod.yml logs api` — check for database connection or schema issues |
| Blank page | `sudo docker compose -f docker-compose.prod.yml logs web` — check nginx is serving files |
| Database connection refused | `sudo docker compose -f docker-compose.prod.yml logs postgres` — check health status |
| Schema out of sync | Re-run `prisma db push` (see above) |
| Containers won't start | Check disk space: `df -h` and Docker storage: `sudo docker system df` |

### Reset everything

```bash
cd /opt/thanamol-crm/deploy
sudo docker compose -f docker-compose.prod.yml down -v  # WARNING: deletes database data
sudo docker compose -f docker-compose.prod.yml build --no-cache
sudo docker compose -f docker-compose.prod.yml up -d
```

## Local Development

For local development, use the root `docker-compose.yml` (PostgreSQL only):

```bash
# Start database
docker compose up -d

# Install deps and start dev servers
pnpm install
pnpm dev
```

This starts:
- PostgreSQL on `localhost:5432`
- API dev server on `localhost:3000`
- Web dev server on `localhost:5173`
