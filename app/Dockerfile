FROM oven/bun:1.3.14 AS builder
WORKDIR /build

# Build-time env placeholders for backend/src/lib/config.ts validation.
# The backend's config.ts calls process.exit(1) on import if env is invalid;
# Vite pulls these in transitively while bundling SSR server code. Real values
# are injected at runtime via env_file (docker-compose) or container env.
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder \
    REDIS_URL=redis://localhost:6379 \
    BETTER_AUTH_SECRET=build-time-placeholder-must-be-at-least-thirty-two-chars-long \
    BETTER_AUTH_URL=http://localhost:50200 \
    NODE_ENV=production

# Copy and install backend
COPY backend/package.json backend/bun.lock* backend/
RUN cd backend && (bun install --frozen-lockfile 2>/dev/null || bun install)
COPY backend/ backend/

# Copy and install app
COPY app/package.json app/
RUN cd app && bun install
COPY app/ app/

# Build app (which needs backend source for SSR imports)
RUN cd app && bun run build

FROM oven/bun:1.3.14-alpine
WORKDIR /app
COPY --from=builder /build/app/build ./build
COPY --from=builder /build/app/package.json ./
COPY --from=builder /build/app/node_modules ./node_modules
# Backend source needed at runtime for SSR imports
COPY --from=builder /build/backend ./backend
EXPOSE 3000
CMD ["bun", "run", "build/index.js"]
