# Contributing to hiai-admin

Thank you for your interest in contributing to hiai-admin!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/hiailabs/hiai-admin.git
cd hiai-admin

# Install dependencies
cd backend && bun install && cd ..
cd app && bun install && cd ..

# Set up environment
cp backend/.env.example backend/.env
# Edit backend/.env with your database and Redis credentials

# Start infrastructure
docker compose up -d postgres redis

# Run database migrations
cd backend && bun run db:migrate && bun run db:seed && cd ..

# Start development servers
bun run dev
```

## Code Style

- **TypeScript**: Strict mode, ESM-only, no `any` without justification
- **Backend**: Elysia framework, Drizzle ORM, Zod validation
- **Frontend**: Svelte 5 runes ($state, $derived, $effect), Tailwind CSS v4
- **Naming**: camelCase for variables/functions, PascalCase for types/components, snake_case for DB columns
- **Commits**: Use conventional commits (feat:, fix:, docs:, refactor:, test:, chore:)

## Testing

```bash
# Run all backend tests
cd backend && bun test

# Run a specific test
cd backend && bun test src/__tests__/rbac.test.ts

# Type check
cd backend && bunx tsc --noEmit
```

## Pull Request Process

1. Create a feature branch from `main`
2. Write tests for new functionality
3. Ensure `bunx tsc --noEmit` passes (0 errors)
4. Ensure `bun test` passes (all green)
5. Update documentation if needed
6. Submit PR with clear description

## Architecture

```
backend/src/
  api/           → Elysia routes and middleware
  db/            → Drizzle ORM schemas and migrations
  lib/           → Shared utilities (config, db, redis, logger, encryption)
  modules/       → Business logic (tenant, user, rbac, billing, audit, settings, integration)
  auth/          → Better Auth configuration
  __tests__/     → Unit tests

app/src/
  lib/           → Shared components, stores, API client
  routes/        → SvelteKit pages (admin dashboard, tenants, users, billing, etc.)
```

## Security

Please report security vulnerabilities to security@hiai.dev. See [SECURITY.md](SECURITY.md) for details.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
