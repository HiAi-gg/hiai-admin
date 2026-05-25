import { describe, it, expect, mock, beforeEach } from 'bun:test';

// Mock the entire db module with a chainable mock
const mockSelect = mock(() => mockChain);
const mockInsert = mock(() => mockChain);
const mockUpdate = mock(() => mockChain);
const mockDelete = mock(() => mockChain);

const mockChain: any = {
  select: mockSelect,
  from: mock(() => mockChain),
  where: mock(() => mockChain),
  limit: mock(() => mockChain),
  offset: mock(() => mockChain),
  orderBy: mock(() => mockChain),
  values: mock(() => mockChain),
  set: mock(() => mockChain),
  returning: mock(() => []),
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
};

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
};

mock.module('../../lib/db.js', () => ({ db: mockDb }));
mock.module('../../db/index.js', () => ({ db: mockDb }));

describe('Tenant Service', () => {
  beforeEach(() => {
    mockSelect.mockClear();
    mockInsert.mockClear();
    mockUpdate.mockClear();
    mockDelete.mockClear();
  });

  it('should be importable', async () => {
    const mod = await import('../modules/tenant/tenant.service.js');
    expect(mod.tenantService).toBeDefined();
    expect(typeof mod.tenantService.create).toBe('function');
    expect(typeof mod.tenantService.list).toBe('function');
    expect(typeof mod.tenantService.getById).toBe('function');
    expect(typeof mod.tenantService.suspend).toBe('function');
    expect(typeof mod.tenantService.reactivate).toBe('function');
    expect(typeof mod.tenantService.changePlan).toBe('function');
  });

  it('should have all required tenant operations', async () => {
    const mod = await import('../modules/tenant/tenant.service.js');
    const service = mod.tenantService;
    // Verify all methods exist
    expect(service.create).toBeInstanceOf(Function);
    expect(service.update).toBeInstanceOf(Function);
    expect(service.list).toBeInstanceOf(Function);
    expect(service.getById).toBeInstanceOf(Function);
    expect(service.suspend).toBeInstanceOf(Function);
    expect(service.reactivate).toBeInstanceOf(Function);
    expect(service.changePlan).toBeInstanceOf(Function);
    expect(service.softDelete).toBeInstanceOf(Function);
  });
});
