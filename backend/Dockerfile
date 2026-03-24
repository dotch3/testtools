# backend/Dockerfile
# Multi-stage build — keeps the final image small (~180MB).

# ── Stage 1: builder ──────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate
RUN npm run build

# ── Stage 2: runner ───────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Install production dependencies and dev dependencies needed for Prisma
COPY package*.json ./
RUN npm ci --omit=dev && npm install prisma tsx && apk add --no-cache postgresql-client

# Copy compiled output and Prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Copy entrypoint script
COPY scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create storage and log directories
RUN mkdir -p /data/uploads /logs

EXPOSE 3001

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
