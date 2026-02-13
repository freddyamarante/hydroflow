# ============================================
# Stage 1: Dependencies
# ============================================
FROM oven/bun:1-alpine AS deps

WORKDIR /app

# Install build tools for native modules (argon2)
RUN apk add --no-cache make g++ python3

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# ============================================
# Stage 2: Builder
# ============================================
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Generate Prisma client
RUN bun run prisma:generate

# Build application
RUN bun run build

# ============================================
# Stage 3: Runner (Production)
# ============================================
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Set environment
ENV NODE_ENV=production

# Install build tools for native modules (argon2)
RUN apk add --no-cache make g++ python3

# Copy package files and install production dependencies
COPY package.json bun.lock* ./
RUN bun install --production --frozen-lockfile

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
  CMD bun -e "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1))"

# Start application
CMD ["bun", "run", "start"]
