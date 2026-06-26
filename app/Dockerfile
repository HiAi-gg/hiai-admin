FROM oven/bun:1.3.14 AS builder

# Use /workspace as the workspace root so the cloned @hiai/ui is discoverable
# as a Bun workspace package by the app in /workspace/app.
WORKDIR /workspace

# Install git so the builder image can clone @hiai/ui
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*

# Clone hiai-ui workspace dependency
RUN mkdir -p /workspace/packages && \
    git clone --depth 1 https://github.com/HiAi-gg/hiai-ui.git /workspace/packages/hiai-ui && \
    sed -i 's|"name": "@hiai-gg/hiai-ui"|"name": "@hiai/ui"|' /workspace/packages/hiai-ui/package.json

# Workspace root package.json declaring packages/* and app as workspaces
RUN echo '{"name":"hiai-admin-workspace","private":true,"workspaces":["packages/*","app"]}' > /workspace/package.json

# Build the app inside the workspace
WORKDIR /workspace/app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install
COPY . .
RUN bun run build

FROM oven/bun:1.3.14-alpine
WORKDIR /workspace/app
COPY --from=builder /workspace/app/build ./build
COPY --from=builder /workspace/app/package.json ./
COPY --from=builder /workspace/app/node_modules ./node_modules
EXPOSE 3000
CMD ["bun", "run", "build/index.js"]