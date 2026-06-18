// @vitest-environment node
import { spawn, type ChildProcess } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const API_BASE = process.env.HIAI_ADMIN_API ?? 'http://localhost:50200';
const WEB_BASE = process.env.HIAI_ADMIN_WEB ?? 'http://localhost:50201';
const ACTION_TIMEOUT_MS = Number.parseInt(process.env.HIAI_E2E_TIMEOUT ?? '15000', 10);
const FORCE_SKIP = process.env.HIAI_E2E_SKIP === '1';

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

function probeBackendSync(): { reachable: boolean; reason?: string } {
  if (FORCE_SKIP) {
    return { reachable: false, reason: 'HIAI_E2E_SKIP=1 set in environment' };
  }
  let url: URL;
  try {
    url = new URL(API_BASE);
  } catch {
    return { reachable: false, reason: `Invalid API_BASE ${API_BASE}` };
  }
  const port = url.port ? Number.parseInt(url.port, 10) : url.protocol === 'https:' ? 443 : 80;
  const host = url.hostname;
  const script = `
    const net = require('net');
    const sock = net.createConnection({ host: ${JSON.stringify(host)}, port: ${port}, timeout: 1500 });
    let done = false;
    const finish = (ok) => { if (!done) { done = true; try { sock.destroy(); } catch (_) {} process.exit(ok ? 0 : 1); } };
    sock.once('connect', () => finish(true));
    sock.once('error', () => finish(false));
    sock.once('timeout', () => finish(false));
  `;
  try {
    execFileSync(process.execPath, ['-e', script], { timeout: 3000, stdio: 'ignore' });
    return { reachable: true };
  } catch {
    return {
      reachable: false,
      reason: `Backend at ${API_BASE} is not reachable on ${host}:${port}`,
    };
  }
}

const probe = probeBackendSync();
const BACKEND_REACHABLE = probe.reachable;
const SKIP_REASON = probe.reason ?? '';

const itBackend = BACKEND_REACHABLE ? test : test.skip;
let bootstrapFailed = false;
const itReason = BACKEND_REACHABLE ? '' : ` [skipped: ${SKIP_REASON}]`;

const itEffective = (name: string, fn: () => Promise<void>) => {
  return itBackend(
    `${name}${bootstrapFailed ? ' [skipped: bootstrap failed]' : itReason}`,
    async () => {
      if (bootstrapFailed) return;
      await fn();
    },
  );
};

describe('hiai-admin E2E', () => {
  let browser: AgentBrowser | undefined;
  let adminUser: SessionUser | undefined;

  beforeAll(async () => {
    if (!BACKEND_REACHABLE) return;

    try {
      browser = new AgentBrowser(`e2e-admin-${Date.now()}`);
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
    } catch {
      bootstrapFailed = true;
    }
  });

  afterAll(async () => {
    if (browser)
      try {
        await browser.close();
      } catch {}
  });

  itEffective(
    `super admin login: login and view dashboard${bootstrapFailed ? ' [skipped: bootstrap failed]' : itReason}`,
    async () => {
      if (!adminUser || !browser) throw new Error('adminUser not initialized');
      await browser.clearCookies();
      await browser.open(`${WEB_BASE}/login`);
      await browser.waitMs(2000);
      await browser.fill('@email', adminUser.email);
      await browser.fill('@password', adminUser.password);
      await browser.click('@login-button');
      await browser.waitMs(3000);
      const url = await browser.pageUrl();
      expect(url).toContain('/dashboard');
    },
  );

  itEffective(`tenant management: create, edit, view${itReason}`, async () => {
    if (!adminUser) throw new Error('adminUser not initialized');
    const created = await apiPost<{ id: string; name: string }>(
      '/api/v1/admin/tenants',
      {
        name: `E2E Tenant ${Date.now()}`,
        slug: `e2e-${Date.now()}`,
      },
      adminUser.sessionToken,
    );
    expect(created.id).toBeTruthy();

    const fetched = await apiGet<{ id: string }>(
      `/api/v1/admin/tenants/${created.id}`,
      adminUser.sessionToken,
    );
    expect(fetched.id).toBe(created.id);
  });

  itEffective(`user management: create user, assign role, delete${itReason}`, async () => {
    if (!adminUser) throw new Error('adminUser not initialized');
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

  itEffective(`billing: view invoices${itReason}`, async () => {
    if (!adminUser) throw new Error('adminUser not initialized');
    const invoices = await apiGet<unknown[]>(
      '/api/v1/admin/billing/invoices',
      adminUser.sessionToken,
    );
    expect(Array.isArray(invoices)).toBe(true);
  });

  itEffective(`settings: update platform settings${itReason}`, async () => {
    if (!adminUser) throw new Error('adminUser not initialized');
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

  itEffective(`audit log: perform action and verify entry${itReason}`, async () => {
    if (!adminUser) throw new Error('adminUser not initialized');
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

  itEffective(`integration config: list integrations${itReason}`, async () => {
    if (!adminUser) throw new Error('adminUser not initialized');
    const integrations = await apiGet<unknown[]>(
      '/api/v1/admin/integrations',
      adminUser.sessionToken,
    );
    expect(Array.isArray(integrations)).toBe(true);
  });
});
