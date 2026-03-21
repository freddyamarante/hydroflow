# HydroFlow

IoT monitoring system for shrimp farm water management.

## Tech Stack

- **Backend:** Bun + Fastify + Prisma + PostgreSQL + TimescaleDB
- **Frontend:** Next.js 14 (App Router) - Coming soon
- **MQTT:** Mosquitto
- **Infra:** Docker + Hetzner VPS + GitHub Actions

## Local Development

### Prerequisites

- Bun 1.0+
- Docker Desktop

### Setup

1. **Start local services** (PostgreSQL, Redis, Mosquitto):

```bash
bun run dev:services
```

1. **Install dependencies**:

```bash
bun install
```

1. **Set up backend**:

```bash
cd backend
bun prisma:generate
bun prisma:migrate:dev
```

1. **Run backend** (hot reload):

```bash
bun dev
```

The backend will be available at `http://localhost:3000`

### Stop Services

```bash
bun run dev:services:stop
```

## Environment Structure

```
Local Development:
├── docker-compose.yml      # Services only (PostgreSQL, Redis, Mosquitto)
├── backend/.env            # Backend environment variables
└── Backend runs outside Docker with hot reload

Staging:
├── docker-compose.staging.yml   # Full stack with nginx
├── .env.staging (on server)
└── Auto-deployed via GitHub Actions on push to staging branch

Production:
├── docker-compose.prod.yml      # Full stack with nginx
├── .env.prod (on server)
└── Auto-deployed via GitHub Actions on push to main branch
```

## Deployment Workflow

**⚠️ NEVER deploy directly to the server!**

Always use the git workflow:

```bash
# 1. Make changes locally
git checkout -b feature/my-feature

# 2. Test in staging
git checkout staging
git merge feature/my-feature
git push origin staging
# → Auto-deploys to staging server

# 3. Deploy to production
git checkout main
git merge staging
git push origin main
# → Auto-deploys to production server
```

## Live Endpoints

- **Production API:** <https://api.hydro-flow.io>
- **Production Web:** <https://hydro-flow.io> (coming soon)
- **Staging API:** <https://api-staging.hydro-flow.io>
- **Staging Web:** <https://staging.hydro-flow.io> (coming soon)

## Useful Commands

```bash
# Start local services
bun run dev:services

# Run backend
bun dev

# Database management
bun run prisma:studio         # Visual DB editor
bun run prisma:migrate:dev    # Create new migration

# Stop local services
bun run dev:services:stop
```

## Project Structure

```
hydroflow/
├── backend/             # Fastify API
├── frontend/            # Next.js app (coming soon)
├── docker/              # Docker compose files
├── nginx/               # Nginx configurations
├── mosquitto/           # MQTT broker config
├── claude/              # Development context & skills
└── .github/workflows/   # GitHub Actions (CI/CD)
```

## License

UNLICENSED - Private project for Adolfo Velásquez
