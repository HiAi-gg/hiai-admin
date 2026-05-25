import { describe, it, expect } from 'bun:test';

describe('Audit Service', () => {
  it('should export all required functions', async () => {
    const { auditService } = await import('../modules/audit/audit.service.js');
    expect(auditService).toBeDefined();
    expect(typeof auditService.record).toBe('function');
    expect(typeof auditService.list).toBe('function');
    expect(typeof auditService.export).toBe('function');
  });

  it('should have record, list, export methods', async () => {
    const { auditService } = await import('../modules/audit/audit.service.js');
    expect(auditService.record).toBeInstanceOf(Function);
    expect(auditService.list).toBeInstanceOf(Function);
    expect(auditService.export).toBeInstanceOf(Function);
  });
});
