export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'hiai-admin API',
    description: 'Central admin panel for the HiAi SaaS platform — tenant management, user administration, billing, analytics, and platform settings.',
    version: '1.0.0',
    contact: { name: 'HiAi Team' },
    license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
  },
  servers: [{ url: 'http://localhost:50200', description: 'Local development' }],
  tags: [
    { name: 'Health', description: 'Health check endpoints' },
    { name: 'Tenants', description: 'Tenant management' },
    { name: 'Users', description: 'User management' },
    { name: 'Roles', description: 'Role management' },
    { name: 'Permissions', description: 'Permission management' },
    { name: 'Billing', description: 'Subscription and billing' },
    { name: 'Audit', description: 'Audit log' },
    { name: 'Settings', description: 'Platform settings' },
    { name: 'Integrations', description: 'Third-party integrations' },
    { name: 'Analytics', description: 'Platform analytics' },
    { name: 'Events', description: 'Server-Sent Events' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          '200': { description: 'Service is healthy', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, services: { type: 'object' } } } } } },
        },
      },
    },
    '/api/tenants': {
      get: {
        tags: ['Tenants'],
        summary: 'List tenants',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'active', 'suspended', 'trial'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Paginated tenant list' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — requires tenants:read' },
        },
      },
      post: {
        tags: ['Tenants'],
        summary: 'Create a new tenant',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['name', 'slug'], properties: { name: { type: 'string' }, slug: { type: 'string', pattern: '^[a-z0-9-]+$' }, email: { type: 'string', format: 'email' }, plan: { type: 'string', enum: ['free', 'pro', 'enterprise'] } } } } },
        },
        responses: {
          '201': { description: 'Tenant created' },
          '400': { description: 'Validation error' },
          '403': { description: 'Forbidden — requires tenants:write' },
        },
      },
    },
    '/api/tenants/{id}': {
      get: {
        tags: ['Tenants'],
        summary: 'Get tenant detail',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Tenant detail with users and subscription' }, '404': { description: 'Tenant not found' } },
      },
      put: {
        tags: ['Tenants'],
        summary: 'Update tenant',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Tenant updated' }, '403': { description: 'Forbidden' } },
      },
      delete: {
        tags: ['Tenants'],
        summary: 'Soft-delete tenant',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Tenant deleted' }, '403': { description: 'Forbidden — requires tenants:delete' } },
      },
    },
    '/api/tenants/{id}/suspend': {
      post: {
        tags: ['Tenants'],
        summary: 'Suspend tenant',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Tenant suspended' } },
      },
    },
    '/api/tenants/{id}/reactivate': {
      post: {
        tags: ['Tenants'],
        summary: 'Reactivate suspended tenant',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Tenant reactivated' } },
      },
    },
    '/api/tenants/{id}/change-plan': {
      post: {
        tags: ['Tenants'],
        summary: 'Change tenant plan',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { plan: { type: 'string', enum: ['free', 'pro', 'enterprise'] } } } } } },
        responses: { '200': { description: 'Plan changed' } },
      },
    },
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'List users',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'role', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Paginated user list' }, '403': { description: 'Forbidden — requires users:read' } },
      },
      post: {
        tags: ['Users'],
        summary: 'Create user',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'User created' }, '403': { description: 'Forbidden — requires users:write' } },
      },
    },
    '/api/users/{id}': {
      get: { tags: ['Users'], summary: 'Get user detail', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'User detail' } } },
      put: { tags: ['Users'], summary: 'Update user', security: [{ bearerAuth: [] }], responses: { '200': { description: 'User updated' } } },
      delete: { tags: ['Users'], summary: 'Delete user', security: [{ bearerAuth: [] }], responses: { '200': { description: 'User deleted' } } },
    },
    '/api/users/{id}/assign-role': {
      post: { tags: ['Users'], summary: 'Assign role to user', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Role assigned' } } },
    },
    '/api/users/{id}/revoke-role': {
      post: { tags: ['Users'], summary: 'Revoke role from user', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Role revoked' } } },
    },
    '/api/roles': {
      get: { tags: ['Roles'], summary: 'List all roles with permissions', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Role list' } } },
      post: { tags: ['Roles'], summary: 'Create role', security: [{ bearerAuth: [] }], responses: { '201': { description: 'Role created' } } },
    },
    '/api/roles/{id}': {
      put: { tags: ['Roles'], summary: 'Update role', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Role updated' } } },
      delete: { tags: ['Roles'], summary: 'Delete role (non-system only)', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Role deleted' } } },
    },
    '/api/permissions': {
      get: { tags: ['Permissions'], summary: 'List all permissions', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Permission list' } } },
    },
    '/api/roles/{id}/permissions': {
      post: { tags: ['Permissions'], summary: 'Assign permission to role', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Permission assigned' } } },
    },
    '/api/roles/{id}/permissions/{pid}': {
      delete: { tags: ['Permissions'], summary: 'Revoke permission from role', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Permission revoked' } } },
    },
    '/api/billing/plans': {
      get: { tags: ['Billing'], summary: 'List available plans with features', responses: { '200': { description: 'Plan list' } } },
    },
    '/api/billing/subscription': {
      get: { tags: ['Billing'], summary: 'Get current subscription', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Current subscription' } } },
    },
    '/api/billing/subscribe': {
      post: { tags: ['Billing'], summary: 'Subscribe to a plan', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Subscription created' } } },
    },
    '/api/billing/upgrade': {
      post: { tags: ['Billing'], summary: 'Upgrade plan', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Plan upgraded' } } },
    },
    '/api/billing/downgrade': {
      post: { tags: ['Billing'], summary: 'Downgrade plan', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Plan downgraded' } } },
    },
    '/api/billing/cancel': {
      post: { tags: ['Billing'], summary: 'Cancel subscription at period end', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Subscription cancelled' } } },
    },
    '/api/billing/portal': {
      post: { tags: ['Billing'], summary: 'Create Stripe Customer Portal session', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Portal URL' } } },
    },
    '/api/billing/invoices': {
      get: { tags: ['Billing'], summary: 'List invoices', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }], responses: { '200': { description: 'Invoice list' } } },
    },
    '/api/audit': {
      get: {
        tags: ['Audit'],
        summary: 'List audit logs with filters',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'actorId', in: 'query', schema: { type: 'string' } },
          { name: 'action', in: 'query', schema: { type: 'string' } },
          { name: 'resource', in: 'query', schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: { '200': { description: 'Paginated audit log list' }, '403': { description: 'Forbidden — requires audit:read' } },
      },
    },
    '/api/audit/export': {
      get: { tags: ['Audit'], summary: 'Export audit logs as CSV', security: [{ bearerAuth: [] }], responses: { '200': { description: 'CSV file download', content: { 'text/csv': { schema: { type: 'string' } } } } } },
    },
    '/api/settings': {
      get: { tags: ['Settings'], summary: 'List all settings grouped by category', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Settings grouped by category' } } },
    },
    '/api/settings/{key}': {
      get: { tags: ['Settings'], summary: 'Get single setting', security: [{ bearerAuth: [] }], parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Setting value' }, '404': { description: 'Setting not found' } } },
      put: { tags: ['Settings'], summary: 'Update setting', security: [{ bearerAuth: [] }], parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Setting updated' } } },
    },
    '/api/integrations': {
      get: { tags: ['Integrations'], summary: 'List integrations with status', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Integration list' } } },
      post: { tags: ['Integrations'], summary: 'Create integration', security: [{ bearerAuth: [] }], responses: { '201': { description: 'Integration created' } } },
    },
    '/api/integrations/{id}': {
      put: { tags: ['Integrations'], summary: 'Update integration', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Integration updated' } } },
      delete: { tags: ['Integrations'], summary: 'Delete integration', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Integration deleted' } } },
    },
    '/api/integrations/{id}/test': {
      post: { tags: ['Integrations'], summary: 'Test integration connection', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Connection test result' } } },
    },
    '/api/analytics/overview': {
      get: { tags: ['Analytics'], summary: 'Platform analytics overview (MRR, churn, LTV, CAC, active tenants)', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Analytics overview' } } },
    },
    '/api/analytics/mrr': {
      get: { tags: ['Analytics'], summary: 'MRR trend (12 months)', security: [{ bearerAuth: [] }], responses: { '200': { description: 'MRR data' } } },
    },
    '/api/analytics/tenants': {
      get: { tags: ['Analytics'], summary: 'Tenant distribution by plan and status', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Tenant analytics' } } },
    },
    '/api/analytics/churn': {
      get: { tags: ['Analytics'], summary: 'Churn analysis', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Churn data' } } },
    },
    '/api/events': {
      get: { tags: ['Events'], summary: 'Server-Sent Events stream for real-time updates', security: [{ bearerAuth: [] }], responses: { '200': { description: 'SSE stream', content: { 'text/event-stream': { schema: { type: 'string' } } } } } },
    },
    '/api/webhooks/stripe': {
      post: {
        tags: ['Billing'],
        summary: 'Stripe webhook handler',
        description: 'Handles invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted',
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Webhook processed' }, '400': { description: 'Invalid signature' } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Tenant: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          slug: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          status: { type: 'string', enum: ['pending', 'active', 'suspended', 'trial'] },
          plan: { type: 'string', enum: ['free', 'pro', 'enterprise'] },
          stripeCustomerId: { type: 'string' },
          stripeAccountId: { type: 'string' },
          settings: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['super_admin', 'tenant_admin', 'editor', 'viewer'] },
          twoFactorEnabled: { type: 'boolean' },
        },
      },
      Role: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          isSystem: { type: 'boolean' },
          permissions: { type: 'array', items: { type: 'string' } },
        },
      },
      AuditLog: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          actorId: { type: 'string' },
          actorEmail: { type: 'string' },
          action: { type: 'string' },
          resource: { type: 'string' },
          resourceId: { type: 'string' },
          oldValue: { type: 'object' },
          newValue: { type: 'object' },
          ipAddress: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Plan: {
        type: 'object',
        properties: {
          id: { type: 'string', enum: ['free', 'pro', 'enterprise'] },
          name: { type: 'string' },
          priceCents: { type: 'integer' },
          priceLabel: { type: 'string' },
          maxUsers: { type: 'integer' },
          maxProducts: { type: 'integer' },
          features: { type: 'array', items: { type: 'string' } },
        },
      },
      Subscription: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          plan: { type: 'string' },
          status: { type: 'string', enum: ['active', 'canceled', 'past_due', 'trialing'] },
          currentPeriodStart: { type: 'string', format: 'date-time' },
          currentPeriodEnd: { type: 'string', format: 'date-time' },
          cancelAtPeriodEnd: { type: 'boolean' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'string' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          pages: { type: 'integer' },
        },
      },
    },
  },
};
