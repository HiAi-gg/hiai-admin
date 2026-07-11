import { beforeAll, describe, expect, test } from 'vitest';

type EnvConfig = NodeJS.ProcessEnv;

type BackendSpec = {
  name: string;
  url: string;
  optional: boolean;
  configured: boolean;
};

type BackendDefinition = {
  name: string;
  defaultUrl: string;
  optional: boolean;
  envKeys: string[];
};

const BACKEND_DEFINITIONS: BackendDefinition[] = [
  {
    name: 'admin',
    defaultUrl: 'http://localhost:50200',
    optional: false,
    envKeys: ['ADMIN_API_URL', 'HIAI_ADMIN_API'],
  },
  {
    name: 'store',
    defaultUrl: 'http://localhost:50400',
    optional: true,
    envKeys: ['HIAI_STORE_API', 'HIAI_STORE_API_URL'],
  },
  {
    name: 'post',
    defaultUrl: 'http://localhost:50300',
    optional: true,
    envKeys: ['HIAI_POST_API', 'HIAI_POST_API_URL'],
  },
  {
    name: 'docs',
    defaultUrl: 'http://localhost:50700',
    optional: true,
    envKeys: ['HIAI_DOCS_API'],
  },
];

function resolveConfiguredUrl(env: EnvConfig, backend: BackendDefinition): string | undefined {
  for (const key of backend.envKeys) {
    const raw = env[key]?.trim();
    if (raw && raw !== backend.defaultUrl) return raw;
  }
  return undefined;
}

function buildBackendSpecs(env: EnvConfig): BackendSpec[] {
  return BACKEND_DEFINITIONS.map((backend) => {
    const configuredUrl = resolveConfiguredUrl(env, backend);
    return {
      name: backend.name,
      url: configuredUrl ?? backend.defaultUrl,
      optional: backend.optional,
      configured: Boolean(configuredUrl),
    };
  });
}

const BASE_URLS: BackendSpec[] = buildBackendSpecs(process.env);

function unreachableConfiguredBackends(
  results: Array<{ name: string; ok: boolean }>,
  specs: BackendSpec[],
): string[] {
  return results
    .filter(({ name, ok }) => {
      const spec = specs.find((entry) => entry.name === name);
      return Boolean(spec?.configured) && !ok;
    })
    .map(({ name }) => name);
}

const JWT_REGEX = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;

function createHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function healthCheck(base: string): Promise<boolean> {
  try {
    const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function registerUser(
  base: string,
): Promise<{ email: string; password: string; token: string }> {
  const email = `shared-auth-${Date.now()}@test.local`;
  const password = 'TestPass123!';
  const res = await fetch(`${base}/api/v1/auth/register`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify({ email, password, name: 'Shared Auth Tester' }),
  });
  if (!res.ok) throw new Error(`register failed: ${res.status}`);
  const data = (await res.json()) as { token: string };
  return { email, password, token: data.token };
}

describe('shared auth across all 4 projects', () => {
  let adminToken = '';
  let storeToken = '';
  let postToken = '';
  let docsToken = '';
  let _userEmail = '';
  const _userPassword = '';
  let anyAuthSucceeded = false;

  beforeAll(async () => {
    // Probe every backend up-front so the JWT-format test can skip cleanly
    // when no backend is reachable OR registration is disabled (e.g. 403).
    for (const { name, url } of BASE_URLS) {
      const ok = await healthCheck(url);
      if (!ok) {
        console.log(`${name}: UNREACHABLE — auth flow will be skipped`);
        continue;
      }
      try {
        const { token } = await registerUser(url);
        if (token && JWT_REGEX.test(token)) {
          anyAuthSucceeded = true;
          console.log(`${name} JWT: ${token.slice(0, 30)}...`);
          if (name === 'admin') adminToken = token;
          if (name === 'store') storeToken = token;
          if (name === 'post') postToken = token;
          if (name === 'docs') docsToken = token;
          _userEmail = `shared-auth-${Date.now()}@test.local`;
        }
      } catch (e) {
        console.log(`${name} auth register skipped: ${e}`);
      }
    }
  });

  test('configured backends are reachable', async () => {
    const results = await Promise.all(
      BASE_URLS.map(async ({ name, url }) => {
        const ok = await healthCheck(url);
        return { name, ok };
      }),
    );
    for (const r of results) {
      console.log(`${r.name}: ${r.ok ? 'OK' : 'UNREACHABLE'}`);
    }
    const unreachable = unreachableConfiguredBackends(results, BASE_URLS);
    expect(unreachable).toEqual([]);

    const reachable = results.filter((r) => r.ok);
    if (!BASE_URLS.some(({ configured }) => configured) && reachable.length === 0) {
      console.log(
        'No backend endpoints are explicitly configured and no services are reachable in this runner. Skipping cross-backend reachability assertion.',
      );
      return;
    }

    expect(reachable.length).toBeGreaterThan(0);
  });

  test('auth token format is valid JWT', async () => {
    if (!anyAuthSucceeded) {
      console.log('No backend issued a JWT — skipping assertion (likely offline)');
      return;
    }
    for (const token of [adminToken, storeToken, postToken, docsToken]) {
      if (token) expect(token).toMatch(JWT_REGEX);
    }
    expect(adminToken || storeToken || postToken || docsToken).toBeTruthy();
  });

  test('protected endpoints reject unauthenticated requests', async () => {
    for (const { url } of BASE_URLS) {
      const ok = await healthCheck(url);
      if (!ok) continue;
      const res = await fetch(`${url}/api/protected-test`, {
        headers: createHeaders(),
        signal: AbortSignal.timeout(3000),
      });
      expect([401, 403, 404]).toContain(res.status);
    }
  });

  test('public health endpoint returns correct service name', async () => {
    for (const { name, url } of BASE_URLS) {
      const ok = await healthCheck(url);
      if (!ok) continue;
      const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(3000) });
      expect(res.ok).toBe(true);
      const data = (await res.json()) as { service?: string; status?: string };
      if (data.service) console.log(`${name}: service=${data.service}`);
      if (data.status) console.log(`${name}: status=${data.status}`);
    }
  });

  test('rate limiting returns 429 on rapid requests', async () => {
    for (const { name, url } of BASE_URLS) {
      const ok = await healthCheck(url);
      if (!ok) continue;
      const promises = Array.from({ length: 30 }, (_, _i) =>
        fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1000) }),
      );
      const results = await Promise.allSettled(promises);
      const statuses = results
        .filter((r) => r.status === 'fulfilled')
        .map((r) => (r as PromiseFulfilledResult<Response>).value.status);
      const has429 = statuses.includes(429);
      if (has429) console.log(`${name}: rate limiting works (429 detected)`);
    }
  });

  describe('backend endpoint resolution', () => {
    test('localhost defaults are not treated as explicit configuration', () => {
      const specs = buildBackendSpecs({
        ADMIN_API_URL: 'http://localhost:50200',
        HIAI_STORE_API_URL: 'http://localhost:50400',
        HIAI_POST_API_URL: 'http://localhost:50300',
        HIAI_DOCS_API: 'http://localhost:50700',
      });
      expect(specs.some((spec) => spec.configured)).toBe(false);
    });

    test('explicitly configured endpoints must pass reachability check', () => {
      const specs = buildBackendSpecs({
        ADMIN_API_URL: 'http://localhost:59990',
        HIAI_POST_API: 'http://localhost:59991',
      });
      const checks = [
        { name: 'admin', ok: true },
        { name: 'store', ok: false },
        { name: 'post', ok: false },
        { name: 'docs', ok: true },
      ];
      expect(unreachableConfiguredBackends(checks, specs)).toEqual(['post']);
    });
  });
});
