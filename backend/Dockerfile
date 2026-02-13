# ============================================
# Stage 1: Dependencies
# ============================================
# Build context: repo root
FROM oven/bun:1-alpine AS deps

WORKDIR /app

# Install build tools for native modules (argon2)
RUN apk add --no-cache make g++ python3

# Copy package.json only (no workspace lockfile — it causes frozen lockfile errors)
COPY backend/package.json ./

# Install dependencies
RUN bun install

# ============================================
# Stage 2: Builder
# ============================================
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy backend source code
COPY backend/ .

# Generate Prisma client
RUN bun run prisma:generate

# Build application
RUN bun run build

# ============================================
# Stage 3: Runner (Production)
# ============================================
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Install build tools for native modules (argon2)
RUN apk add --no-cache make g++ python3

# Copy package.json and install production dependencies
COPY backend/package.json ./
RUN bun install --production

# Set environment after install
ENV NODE_ENV=production

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Create non-root user
RUN addgroup --system --gid 1001 bunuser && \
    adduser --system --uid 1001 hydroflow && \
    chown -R hydroflow:bunuser /app

USER hydroflow

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000').then(r => process.exit(r.ok ? 0 : 1))"

# Start application
CMD ["bun", "run", "start"]
