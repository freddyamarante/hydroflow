FROM oven/bun:1-alpine
WORKDIR /app
COPY scripts/package.json ./
RUN bun install
COPY scripts/ ./
CMD ["bun", "run", "mqtt-mock.ts"]
