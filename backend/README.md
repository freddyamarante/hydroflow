# HydroFlow Backend

IoT monitoring system backend for shrimp farm water management.

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Fastify
- **Database:** PostgreSQL + TimescaleDB
- **ORM:** Prisma
- **MQTT:** mqtt.js
- **Validation:** Zod
- **Language:** TypeScript (strict mode)

## Prerequisites

- Bun 1.0+
- PostgreSQL 15+
- Mosquitto MQTT broker

## Setup

1. Install dependencies:
```bash
bun install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Configure `.env` with your credentials

4. Generate Prisma client:
```bash
bun run prisma:generate
```

5. Run migrations:
```bash
bun run prisma:migrate:dev
```

## Development

Start dev server with hot reload:
```bash
bun dev
```

The server will start on `http://localhost:3000`

## Production

Build:
```bash
bun run build
```

Start:
```bash
bun start
```

## Docker

Build image:
```bash
docker build -t hydroflow-backend .
```

Run container:
```bash
docker run -p 3000:3000 --env-file .env hydroflow-backend
```

## Database

### Migrations

Create new migration:
```bash
bun run prisma:migrate:dev
```

Deploy migrations (production):
```bash
bun run prisma:migrate
```

### Prisma Studio

Open visual database editor:
```bash
bun run prisma:studio
```

## API Endpoints

- `GET /` - API information
- `GET /health` - Health check (includes DB status)

## Project Structure

```
src/
├── config/         # Environment configuration
├── index.ts        # Server entry point
├── lib/            # Shared libraries (Prisma, RBAC, access control)
├── plugins/        # Fastify plugins (auth)
├── routes/         # API endpoints
├── services/       # MQTT client & sensor readings
├── types/          # Shared TypeScript types & Fastify augmentations
└── utils/          # Utilities (TODO)
```

## Environment Variables

See `.env.example` for all required variables.

## License

UNLICENSED - Private project for Adolfo Velásquez
