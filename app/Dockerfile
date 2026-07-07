FROM oven/bun:1.3.14 AS builder
WORKDIR /build

# Build-time env placeholders — the config module (imported from backend)
# validates REDIS_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL eagerly during
# SSR bundle. These defaults let the build pass without real secrets;
# real values are injected at container runtime via env_file / -e flags.
ARG REDIS_URL=redis://placeholder:6379
ENV REDIS_URL=$REDIS_URL
ARG BETTER_AUTH_SECRET=placeholder-must-be-at-least-32-characters-long-ok
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
ARG BETTER_AUTH_URL=http://localhost:50200
ENV BETTER_AUTH_URL=$BETTER_AUTH_URL
ARG DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV DATABASE_URL=$DATABASE_URL

# Copy and install backend
COPY backend/package.json backend/bun.lock* backend/
RUN cd backend && (bun install --ignore-scripts --frozen-lockfile 2>/dev/null || bun install --ignore-scripts)
COPY backend/ backend/

# Copy and install app
COPY app/package.json app/
RUN cd app && (bun install --ignore-scripts --frozen-lockfile 2>/dev/null || bun install --ignore-scripts)
COPY app/ app/

# Build app (which imports backend modules during SSR bundle, but with the
# lazy env/auth layer those imports no longer need runtime secrets at build
# time — no fake env placeholders required).
RUN cd app && bun run build

FROM oven/bun:1.3.14-alpine
WORKDIR /app
COPY --from=builder /build/app/build ./build
COPY --from=builder /build/app/package.json ./
COPY --from=builder /build/app/node_modules ./node_modules
# Backend source is intentionally copied: the SvelteKit SSR layer mints SSO tokens
# using the decrypted per-adapter JWT secret (app/src/lib/server/adapter-secret.ts),
# which must never cross an HTTP boundary, and several server routes import backend
# services in-process. Full removal requires moving SSO minting into the backend
# (future refactor). Runtime env (DATABASE_URL etc.) arrives via the `env_file`.
COPY --from=builder /build/backend ./backend
EXPOSE 3000
CMD ["bun", "run", "build/index.js"]
