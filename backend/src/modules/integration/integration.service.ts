import { db } from '../../lib/db.js';
import { integrations } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from '../../lib/encryption.js';
import { randomUUID } from 'node:crypto';

export const integrationService = {
  async create(name: string, type: string, credentials: Record<string, string>, config?: Record<string, any>) {
    const credentialsEncrypted = await encrypt(JSON.stringify(credentials));
    const [integration] = await db.insert(integrations).values({
      id: randomUUID(),
      name,
      type,
      credentialsEncrypted,
      config: config || {},
      status: 'disconnected'
    }).returning();
    return { ...integration, credentialsEncrypted: undefined };
  },

  async update(id: string, credentials?: Record<string, string>, config?: Record<string, any>) {
    const updates: any = { updatedAt: new Date() };
    if (credentials) updates.credentialsEncrypted = await encrypt(JSON.stringify(credentials));
    if (config) updates.config = config;

    const [updated] = await db.update(integrations)
      .set(updates)
      .where(eq(integrations.id, id))
      .returning();
    return { ...updated, credentialsEncrypted: undefined };
  },

  async delete(id: string) {
    await db.delete(integrations).where(eq(integrations.id, id));
  },

  async list() {
    const all = await db.select().from(integrations);
    return all.map(i => ({ ...i, credentialsEncrypted: undefined }));
  },

  async testConnection(id: string) {
    const [integration] = await db.select().from(integrations).where(eq(integrations.id, id));
    if (!integration) throw new Error('Integration not found');

    if (!integration.credentialsEncrypted) throw new Error('No credentials stored');
    const credentials = JSON.parse(await decrypt(integration.credentialsEncrypted));

    // Test based on type
    switch (integration.type) {
      case 'stripe': {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(credentials.apiKey);
        await stripe.balance.retrieve();
        return { success: true, message: 'Stripe connection successful' };
      }
      case 'shippo': {
        const response = await fetch('https://api.goshippo.com/addresses/', {
          headers: { Authorization: `ShippoToken ${credentials.apiKey}` }
        });
        return { success: response.ok, message: response.ok ? 'Shippo connection successful' : 'Shippo connection failed' };
      }
      default:
        return { success: false, message: `Unknown integration type: ${integration.type}` };
    }
  }
};
