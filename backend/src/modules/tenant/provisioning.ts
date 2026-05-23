import { tenantService } from './tenant.service.js';
import { db } from '../../lib/db.js';
import { userTenantAccess } from '../../db/schema/index.js';

export async function provisionTenant(name: string, slug: string, ownerEmail: string, plan: string = 'free') {
  // 1. Create tenant
  const tenant = await tenantService.create({ name, slug, email: ownerEmail, plan });

  // 2. TODO: Create Stripe customer via stripe.service
  // 3. TODO: Send welcome email via Novu
  // 4. TODO: Create owner user if not exists

  return tenant;
}
