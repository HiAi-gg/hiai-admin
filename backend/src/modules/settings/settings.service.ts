import { db } from '../../lib/db.js';
import { settings } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';

export const settingsService = {
  async get(key: string) {
    const [setting] = await db.select().from(settings).where(eq(settings.id, key));
    return setting;
  },

  async set(key: string, value: any, updatedBy?: string) {
    const existing = await this.get(key);

    if (existing) {
      const [updated] = await db
        .update(settings)
        .set({ value, updatedAt: new Date(), updatedBy })
        .where(eq(settings.id, key))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(settings)
        .values({
          id: key,
          value,
          updatedBy,
        })
        .returning();
      return created;
    }
  },

  async list() {
    const allSettings = await db.select().from(settings);
    // Group by category (derived from key prefix)
    const grouped: Record<string, any[]> = {};
    for (const setting of allSettings) {
      const category = setting.id.split('_')[0] || 'general';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(setting);
    }
    return grouped;
  },

  async getGroup(category: string) {
    const allSettings = await db.select().from(settings);
    return allSettings.filter((s) => s.id.startsWith(category));
  },
};
