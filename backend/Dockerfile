FROM oven/bun:1.3.14 AS builder
WORKDIR /app
COPY package.json bun.lock* ./
# --ignore-scripts avoids running any package postinstall (which can fail in
# networked Docker builds when scripts reach outbound URLs). Pure Bun runtime
# has no native bindings, so no compiled-output is needed.
RUN bun install --ignore-scripts --frozen-lockfile 2>/dev/null || bun install --ignore-scripts
COPY . .
RUN bun build src/api/index.ts --outdir dist --target bun

FROM oven/bun:1.3.14-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
