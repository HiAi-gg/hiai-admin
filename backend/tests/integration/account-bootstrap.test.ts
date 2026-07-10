import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

interface MockChain {
  select: Mock;
  from: Mock;
  where: Mock;
  limit: Mock;
  values: Mock;
  returning: Mock;
  onConflictDoNothing: Mock;
  insert: Mock;
}

function createInsertChain(returnValues: unknown[]): MockChain {
  const chain = {} as MockChain;
  chain.select = vi.fn(() => chain);
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.values = vi.fn(() => chain);
  chain.returning = vi.fn(async () => returnValues);
  chain.onConflictDoNothing = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  return chain;
}

function createReadChain(returnValues: unknown[]): Pick<MockChain, 'select' | 'from' | 'where' | 'limit'> {
  const chain: Pick<MockChain, 'select' | 'from' | 'where' | 'limit'> = {
    select: vi.fn(() => chain),
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(() => chain),
  };
  (chain as unknown as { then: unknown }).then = (
    onFulfilled?: (value: unknown) => unknown,
    onRejected?: (error: unknown) => unknown,
  ) => Promise.resolve(returnValues).then(onFulfilled, onRejected);
  return chain;
}

const dbMock = {
  insert: vi.fn() as Mock,
  select: vi.fn() as Mock,
};

vi.mock('../../src/lib/db.js', () => ({
  db: dbMock,
  withTransaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
}));

vi.mock('../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  createChildLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

const profileRow = {
  id: 'platform-user-id',
  email: 'alice@example.com',
  name: 'Alice',
  role: 'viewer',
  avatarUrl: null,
  twoFactorEnabled: false,
  lastLoginAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const { userService } = await import('../../src/modules/user/user.service.js');

describe('account bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates one platform profile after Better Auth signup', async () => {
    const chain = createInsertChain([profileRow]);
    dbMock.insert.mockReturnValue(chain);

    const result = await userService.ensurePlatformProfile({
      email: 'Alice@Example.com',
      name: 'Alice',
    });

    expect(result).toEqual(profileRow);
    expect(dbMock.insert).toHaveBeenCalledTimes(1);
    expect(chain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alice@example.com',
        name: 'Alice',
        role: 'viewer',
      }),
    );
  });

  it('is idempotent when the Better Auth hook runs twice', async () => {
    const firstInsert = createInsertChain([profileRow]);
    const secondInsert = createInsertChain([]);
    const selectChain = createReadChain([profileRow]);

    dbMock.insert
      .mockReturnValueOnce(firstInsert)
      .mockReturnValueOnce(secondInsert);
    dbMock.select.mockReturnValue(selectChain);

    const first = await userService.ensurePlatformProfile({
      email: 'Alice@Example.com',
      name: 'Alice',
    });
    const second = await userService.ensurePlatformProfile({
      email: 'alice@example.com',
      name: 'Alice',
    });

    expect(first).toEqual(profileRow);
    expect(second).toEqual(profileRow);
    expect(dbMock.insert).toHaveBeenCalledTimes(2);
    expect(dbMock.select).toHaveBeenCalledTimes(1);
  });

  it('defaults the platform role to viewer', async () => {
    const chain = createInsertChain([profileRow]);
    dbMock.insert.mockReturnValue(chain);

    await userService.ensurePlatformProfile({
      email: 'alice@example.com',
      name: 'Alice',
    });

    const valuesArg = chain.values.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(valuesArg?.role).toBe('viewer');
  });

  it('does not grant tenant or site access during account creation', async () => {
    const chain = createInsertChain([profileRow]);
    dbMock.insert.mockReturnValue(chain);

    await userService.ensurePlatformProfile({
      email: 'alice@example.com',
      name: 'Alice',
    });

    expect(dbMock.select).not.toHaveBeenCalled();
    const valuesArg = chain.values.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(valuesArg).toBeDefined();
    expect(valuesArg).not.toHaveProperty('tenantId');
    expect(valuesArg).not.toHaveProperty('siteId');
    expect(valuesArg).not.toHaveProperty('tenantIds');
    expect(valuesArg).not.toHaveProperty('access');
  });
});
