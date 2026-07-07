FROM oven/bun:1.3.14 AS builder
WORKDIR /app
COPY backend/package.json backend/bun.lock* ./backend/
# --ignore-scripts avoids running any package postinstall (which can fail in
# networked Docker builds when scripts reach outbound URLs). Pure Bun runtime
# has no native bindings, so no compiled-output is needed.
RUN cd backend && bun install --ignore-scripts --frozen-lockfile 2>/dev/null || cd backend && bun install --ignore-scripts
COPY backend/ ./backend/
COPY package.json ./
RUN cd backend && bun build src/api/index.ts --outdir dist --target bun

FROM oven/bun:1.3.14-alpine
WORKDIR /app
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package.json ./
COPY --from=builder /app/backend/node_modules ./node_modules
EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
