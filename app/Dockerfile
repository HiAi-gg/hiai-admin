FROM oven/bun:1.3.14 AS builder
WORKDIR /build

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
