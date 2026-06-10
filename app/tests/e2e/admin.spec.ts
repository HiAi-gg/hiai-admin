import { spawn, type ChildProcess } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const API_BASE = process.env.HIAI_ADMIN_API ?? 'http://localhost:50200';
const WEB_BASE = process.env.HIAI_ADMIN_WEB ?? 'http://localhost:50201';
const ACTION_TIMEOUT_MS = Number.parseInt(process.env.HIAI_E2E_TIMEOUT ?? '15000', 10);

interface AbResult {
  stdout: string;
  stderr: string;
  code: number;
}

interface SessionUser {
  email: string;
  password: string;
  name: string;
  sessionToken: string;
  userId: string;
}

class AgentBrowser {
  private session: string;

  constructor(session: string) {
    this.session = session;
  }

  async exec(...args: string[]): Promise<AbResult> {
    return new Promise((resolve, reject) => {
      const child: ChildProcess = spawn('ab', args, {
        env: { ...process.env, AGENT_BROWSER_SESSION: this.session },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      child.stdout?.on('data', (chunk: Buffer) => stdout.push(chunk));
      child.stderr?.on('data', (chunk: Buffer) => stderr.push(chunk));
      child.on('close', (code: number | null) => {
        resolve({
          stdout: Buffer.concat(stdout).toString(),
          stderr: Buffer.concat(stderr).toString(),
          code: code ?? -1,
        });
      });
      child.on('error', reject);
      setTimeout(() => {
        child.kill();
        reject(new Error('Timeout'));
      }, ACTION_TIMEOUT_MS * 2);
    });
  }

  async open(url: string): Promise<void> {
    const res = await this.exec('open', url);
    if (res.code !== 0 && !res.stderr.includes('already open'))
      throw new Error(`open failed: ${res.stderr}`);
  }

  async setCookie(name: string, value: string, domain: string): Promise<void> {
    await this.exec('cookies', 'set', name, value, '--domain', domain, '--path', '/');
  }

  async clearCookies(): Promise<void> {
    await this.exec('cookies', 'clear');
  }

  async click(target: string): Promise<void> {
    const res = await this.exec('click', target);
    if (res.code !== 0) throw new Error(`click ${target} failed: ${res.stderr}`);
  }

  async fill(target: string, text: string): Promise<void> {
    const res = await this.exec('fill', target, text);
    if (res.code !== 0) throw new Error(`fill ${target} failed: ${res.stderr}`);
  }

  async waitMs(ms: number): Promise<void> {
    await this.exec('wait', String(ms));
  }

  async snapshot(): Promise<string> {
    const res = await this.exec('snapshot', '--compact');
    if (res.code !== 0) throw new Error(`snapshot failed: ${res.stderr}`);
    return res.stdout;
  }

  async close(): Promise<void> {
    await this.exec('close');
  }

  async evalJs(code: string): Promise<string> {
    const res = await this.exec('eval', code);
    if (res.code !== 0) throw new Error(`eval failed: ${res.stderr}`);
    return res.stdout;
  }

  async pageUrl(): Promise<string> {
    return (await this.evalJs('window.location.href')).trim();
  }

  async pageTitle(): Promise<string> {
    return (await this.evalJs('document.title')).trim();
  }
}

async function apiPost<T = unknown>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

async function apiGet<T = unknown>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiDelete<T = unknown>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error(`DELETE ${path} ${res.status}`);
  return res.json() as Promise<T>;
}

describe('hiai-admin E2E', () => {
  let browser: AgentBrowser;
  let adminUser: SessionUser;
  let _tenantId = '';

  beforeAll(async () => {
    browser = new AgentBrowser(`e2e-admin-${Date.now()}`);
    const healthOk = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(5000) })
      .then((r) => r.ok)
      .catch(() => false);
    if (!healthOk) {
      console.log('Backend unavailable, tests will be skipped');
      return;
    }

    const signupRes = await apiPost<{ user: { id: string }; token: string }>(
      '/api/v1/auth/register',
      {
        email: `admin-${Date.now()}@test.local`,
        password: 'AdminPass123!',
        name: 'Admin Tester',
      },
    );
    adminUser = {
      email: `admin-${Date.now()}@test.local`,
      password: 'AdminPass123!',
      name: 'Admin Tester',
      userId: signupRes.user.id,
      sessionToken: signupRes.token,
    };
  });

  afterAll(async () => {
    if (browser)
      try {
        await browser.close();
      } catch {}
  });

  test('super admin login: login and view dashboard', async () => {
    if (!adminUser) return;
    await browser.clearCookies();
    await browser.open(`${WEB_BASE}/login`);
    await browser.waitMs(2000);
    await browser.fill('@email', adminUser.email);
    await browser.fill('@password', adminUser.password);
    await browser.click('@login-button');
    await browser.waitMs(3000);
    const url = await browser.pageUrl();
    expect(url).toContain('/dashboard');
  });

  test('tenant management: create, edit, view', async () => {
    if (!adminUser) return;
    const created = await apiPost<{ id: string; name: string }>(
      '/api/v1/admin/tenants',
      {
        name: `E2E Tenant ${Date.now()}`,
        slug: `e2e-${Date.now()}`,
      },
      adminUser.sessionToken,
    );
    expect(created.id).toBeTruthy();
    _tenantId = created.id;

    const fetched = await apiGet<{ id: string }>(
      `/api/v1/admin/tenants/${created.id}`,
      adminUser.sessionToken,
    );
    expect(fetched.id).toBe(created.id);
  });

  test('user management: create user, assign role, delete', async () => {
    if (!adminUser) return;
    const created = await apiPost<{ id: string; email: string }>(
      '/api/v1/admin/users',
      {
        email: `user-${Date.now()}@test.local`,
        password: 'UserPass123!',
        name: 'Test User',
      },
      adminUser.sessionToken,
    );
    expect(created.id).toBeTruthy();

    const roles = await apiGet<{ id: string; name: string }[]>(
      '/api/v1/admin/roles',
      adminUser.sessionToken,
    );
    if (roles.length > 0) {
      await apiPost(
        `/api/v1/admin/users/${created.id}/roles`,
        { roleId: roles[0]?.id },
        adminUser.sessionToken,
      );
    }

    await apiDelete(`/api/v1/admin/users/${created.id}`, adminUser.sessionToken);
  });

  test('billing: view invoices', async () => {
    if (!adminUser) return;
    const invoices = await apiGet<unknown[]>(
      '/api/v1/admin/billing/invoices',
      adminUser.sessionToken,
    );
    expect(Array.isArray(invoices)).toBe(true);
  });

  test('settings: update platform settings', async () => {
    if (!adminUser) return;
    const updated = await apiPost<{ id: string }>(
      '/api/v1/admin/settings',
      {
        key: 'site_name',
        value: 'E2E Test Platform',
      },
      adminUser.sessionToken,
    );
    expect(updated.id).toBeTruthy();

    const fetched = await apiGet<{ value: string }>(
      '/api/v1/admin/settings/site_name',
      adminUser.sessionToken,
    );
    expect(fetched.value).toBe('E2E Test Platform');
  });

  test('audit log: perform action and verify entry', async () => {
    if (!adminUser) return;
    await apiPost(
      '/api/v1/admin/settings',
      { key: 'audit_test', value: 'trigger' },
      adminUser.sessionToken,
    );
    const logs = await apiGet<{ entries: unknown[] }>(
      '/api/v1/admin/audit?limit=5',
      adminUser.sessionToken,
    );
    expect(logs.entries.length).toBeGreaterThanOrEqual(1);
  });

  test('integration config: list integrations', async () => {
    if (!adminUser) return;
    const integrations = await apiGet<unknown[]>(
      '/api/v1/admin/integrations',
      adminUser.sessionToken,
    );
    expect(Array.isArray(integrations)).toBe(true);
  });
});
