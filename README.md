# DevOps Incident & Service Health Platform

NestJS API for registering services, running health checks, managing incidents/alerts, and exposing dashboard/status views.

## Stack

- NestJS + TypeScript
- TypeORM + PostgreSQL
- JWT auth (Passport)
- Jest
- Docker Compose for Postgres *(you own the Compose/Dockerfile)*

## Quick start

1. Copy env and adjust secrets:

```bash
cp .env.example .env
```

2. Start PostgreSQL with your own `docker-compose.yml`, then:

```bash
npm install
npm run migration:run
npm run start:dev
```

3. Health check:

```bash
curl http://localhost:3000/health
```

## Auth bootstrap

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","name":"Admin","password":"password123"}'
```

The first registered user becomes `ADMIN`. Use the returned `accessToken` as:

```text
Authorization: Bearer <token>
```

## Roles

| Role | Access |
|---|---|
| `ADMIN` | Full access, user/role management, team delete |
| `ENGINEER` | Create/update operational resources |
| `VIEWER` | Read-only |

Public routes: `POST /api/auth/register`, `POST /api/auth/login`, `GET /health`, `GET /api`, `GET /api/status`.

## Core API map

- Auth: `/api/auth/*`
- Users/Teams: `/api/users`, `/api/teams`
- Services: `/api/services`
- Health checks: `/api/services/:id/health-checks`, `/api/health-checks/:id(/run|/results)`
- Incidents: `/api/incidents`
- Alerts: `/api/alerts`
- Dashboard: `/api/dashboard/overview`, `/api/dashboard/services`
- Public status: `/api/status`

## Scripts

```bash
npm run typecheck
npm test
npm run build
npm run verify          # typecheck + test + build
npm run migration:run
npm run migration:revert
```

## Docker expectations (implement yourself)

Your Postgres Compose service should provide:

| Env / setting | Example |
|---|---|
| Image | `postgres:16-alpine` |
| Port | `5432:5432` |
| `POSTGRES_USER` | `dip` |
| `POSTGRES_PASSWORD` | `dip` |
| `POSTGRES_DB` | `devops_incident_platform` |
| Volume | persist data dir |
| Healthcheck | `pg_isready -U dip -d devops_incident_platform` |

Match those values to `.env` `DB_*` variables.

## Project layout

```text
src/
  auth/ database/ users/ teams/ services/
  health-checks/ incidents/ alerts/ dashboard/
  common/ config/
```

TypeORM `synchronize` is **disabled**. Schema changes go through migrations in `src/database/migrations`.
