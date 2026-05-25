# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in hiai-admin, please report it responsibly.

**DO NOT** open a public GitHub issue for security vulnerabilities.

### How to Report

1. Email: **security@hiai.dev**
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 5 business days
- **Fix timeline**: Depends on severity
  - Critical: 24-48 hours
  - High: 1 week
  - Medium: 2 weeks
  - Low: Next release cycle

## Security Measures

### Authentication & Authorization
- **Better Auth** for session management with TOTP 2FA support
- **RBAC** with 4-tier role hierarchy: super_admin → tenant_admin → editor → viewer
- **Permission-based access control** on all API endpoints
- Session expiry: 7 days with 1-day update age

### Data Protection
- **AES-256-GCM encryption** for stored credentials (integration API keys)
- All passwords hashed by Better Auth
- **Tenant isolation** — all queries scoped by `tenant_id`
- No sensitive data in logs

### API Security
- **Rate limiting** — Redis-backed, 3 tiers:
  - Auth endpoints: 5 requests / 15 minutes
  - Public API: 100 requests / minute
  - Authenticated: 300 requests / minute
- **CORS** configured for production domains
- **Input validation** with Zod schemas on all endpoints
- **Stripe webhook signature verification** on all payment webhooks

### Infrastructure
- **Docker** containers run as non-root
- **Health checks** on all services
- **Structured logging** with Pino (no secrets in logs)
- **TLS** via Caddy reverse proxy in production

### Audit Trail
- All CUD operations logged to `audit_logs` table
- Logs include: actor, action, resource, old/new values, IP, user agent
- Audit logs are immutable (no UPDATE or DELETE)
- CSV export available for compliance

## Dependency Security

```bash
# Check for vulnerabilities
cd backend && bun audit
cd app && bun audit
```

## Best Practices for Contributors

1. Never commit `.env` files or credentials
2. Use `encryption.ts` for any sensitive data storage
3. Always validate input with Zod schemas
4. Always scope queries by `tenant_id`
5. Always log audit events for CUD operations
6. Use `as any` sparingly — prefer proper types
