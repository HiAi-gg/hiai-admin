# hiai-admin Plugin System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a plugin system to hiai-admin that allows hiai-post, hiai-store, and external integrations (Ko-fi, Umami) to register their navigation, pages, and API proxies into the unified admin shell.

**Architecture:** Plugin registry in `app/src/lib/plugins/`. Each plugin is a TypeScript module that exports a `HiAiPlugin` object. Plugins register nav groups, page routes, and proxy configs. The AdminSidebar reads from the plugin registry. SvelteKit server-side proxy routes forward API requests to plugin backends.

**Tech Stack:** Svelte 5.55+, SvelteKit 2.60+, Elysia 1.4.28+ (backend proxy), TypeScript strict

**Design Spec:** `docs/superpowers/specs/2026-05-25-hiai-ecosystem-design.md` — Section 2 (Architecture), 2.2 (Plugin API), 2.5 (API Proxy)

**Prerequisite:** Plan 1 (@hiai/ui) should be done first — AdminSidebar will use @hiai/ui's shared sidebar component.

---

## File Structure

```
projects/hiai-admin/
├── app/src/
│   ├── lib/
│   │   ├── plugins/
│   │   │   ├── types.ts                    # Plugin API interfaces
│   │   │   ├── registry.ts                 # Plugin registry (register, getNavGroups, getProxyConfigs)
│   │   │   ├── hiai-post.ts                # hiai-post plugin manifest
│   │   │   ├── hiai-store.ts               # hiai-store plugin manifest
│   │   │   ├── kofi.ts                     # Ko-fi plugin manifest
│   │   │   └── umami.ts                    # Umami plugin manifest
│   │   └── components/
│   │       └── AdminSidebar.svelte         # MODIFY: build nav from plugin registry
│   └── routes/
│       └── (admin)/
│           └── api/
│               └── [plugin]/[...path]/
│                   └── +server.ts          # API proxy catch-all route
├── backend/src/
│   └── api/
│       └── index.ts                        # MODIFY: add plugin proxy routes
└── docker-compose.yml                      # MODIFY: add plugin backend services
```

---

### Task 1: Define Plugin API types

**Files:**
- Create: `projects/hiai-admin/app/src/lib/plugins/types.ts`

- [ ] **Step 1: Create plugin type definitions**

```typescript
// projects/hiai-admin/app/src/lib/plugins/types.ts

export interface HiAiPlugin {
  id: string;                    // "hiai-post"
  name: string;                  // "Social Media"
  version: string;               // "1.0.0"
  icon: string;                  // lucide icon name or emoji
  description: string;           // "Social media content planning and publishing"

  // Navigation
  navGroups: NavGroup[];         // Sidebar groups this plugin contributes

  // API proxy config
  proxy: ProxyConfig;            // { prefix: "/api/social", target: "http://localhost:50300" }

  // Lifecycle (optional)
  onInstall?(): Promise<void>;
  onUninstall?(): Promise<void>;
}

export interface NavGroup {
  label?: string;                // Group label (optional for top-level items)
  items: NavItem[];
}

export interface NavItem {
  label: string;                 // "Posts"
  path: string;                  // "/social/posts"
  icon?: string;                 // "📝" or lucide icon name
  badge?: string | number;       // Notification badge
}

export interface ProxyConfig {
  prefix: string;                // "/api/social"
  target: string;                // "http://localhost:50300"
  auth?: 'jwt' | 'api-key';     // Auth forwarding strategy
  rateLimit?: { requests: number; window: number };
}
```

- [ ] **Step 2: Commit**

```bash
git add projects/hiai-admin/app/src/lib/plugins/types.ts
git commit -m "feat(hiai-admin): define plugin API types"
```

---

### Task 2: Implement Plugin Registry

**Files:**
- Create: `projects/hiai-admin/app/src/lib/plugins/registry.ts`

- [ ] **Step 1: Create plugin registry**

```typescript
// projects/hiai-admin/app/src/lib/plugins/registry.ts

import type { HiAiPlugin, NavGroup, ProxyConfig } from './types.js';

const plugins = new Map<string, HiAiPlugin>();

export function registerPlugin(plugin: HiAiPlugin): void {
  if (plugins.has(plugin.id)) {
    console.warn(`Plugin "${plugin.id}" already registered, overwriting`);
  }
  plugins.set(plugin.id, plugin);
}

export function getPlugin(id: string): HiAiPlugin | undefined {
  return plugins.get(id);
}

export function getAllPlugins(): HiAiPlugin[] {
  return [...plugins.values()];
}

export function getNavGroups(): NavGroup[] {
  const groups: NavGroup[] = [];
  for (const plugin of plugins.values()) {
    groups.push(...plugin.navGroups);
  }
  return groups;
}

export function getProxyConfigs(): ProxyConfig[] {
  return [...plugins.values()].map(p => p.proxy);
}

export function getProxyConfig(pluginId: string): ProxyConfig | undefined {
  return plugins.get(pluginId)?.proxy;
}

export function resetRegistry(): void {
  plugins.clear();
}
```

- [ ] **Step 2: Commit**

```bash
git add projects/hiai-admin/app/src/lib/plugins/registry.ts
git commit -m "feat(hiai-admin): implement plugin registry"
```

---

### Task 3: Create Plugin Manifests

**Files:**
- Create: `projects/hiai-admin/app/src/lib/plugins/hiai-post.ts`
- Create: `projects/hiai-admin/app/src/lib/plugins/hiai-store.ts`
- Create: `projects/hiai-admin/app/src/lib/plugins/kofi.ts`
- Create: `projects/hiai-admin/app/src/lib/plugins/umami.ts`

- [ ] **Step 1: Create hiai-post plugin manifest**

```typescript
// projects/hiai-admin/app/src/lib/plugins/hiai-post.ts
import type { HiAiPlugin } from './types.js';

export const hiaiPostPlugin: HiAiPlugin = {
  id: 'hiai-post',
  name: 'Social Media',
  version: '1.0.0',
  icon: '📱',
  description: 'Social media content planning and publishing',

  navGroups: [
    {
      label: 'Social Media',
      items: [
        { label: 'Dashboard', path: '/social/dashboard', icon: '📊' },
        { label: 'Accounts', path: '/social/accounts', icon: '👤' },
        { label: 'Posts', path: '/social/posts', icon: '📝' },
        { label: 'Campaigns', path: '/social/campaigns', icon: '📢' },
        { label: 'Content Plans', path: '/social/content-plans', icon: '📅' },
        { label: 'Templates', path: '/social/templates', icon: '📋' },
        { label: 'Analytics', path: '/social/analytics', icon: '📈' },
      ],
    },
  ],

  proxy: {
    prefix: '/api/social',
    target: 'http://localhost:50300',
    auth: 'jwt',
  },
};
```

- [ ] **Step 2: Create hiai-store plugin manifest**

```typescript
// projects/hiai-admin/app/src/lib/plugins/hiai-store.ts
import type { HiAiPlugin } from './types.js';

export const hiaiStorePlugin: HiAiPlugin = {
  id: 'hiai-store',
  name: 'E-Commerce',
  version: '1.0.0',
  icon: '🛒',
  description: 'Multi-tenant e-commerce platform',

  navGroups: [
    {
      label: 'E-Commerce',
      items: [
        { label: 'Dashboard', path: '/shop/dashboard', icon: '📊' },
        { label: 'Products', path: '/shop/products', icon: '📦' },
        { label: 'Orders', path: '/shop/orders', icon: '🧾' },
        { label: 'Payments', path: '/shop/payments', icon: '💳' },
        { label: 'Promotions', path: '/shop/promotions', icon: '🏷️' },
        { label: 'Shipping', path: '/shop/shipping', icon: '🚚' },
        { label: 'Analytics', path: '/shop/analytics', icon: '📈' },
      ],
    },
  ],

  proxy: {
    prefix: '/api/shop',
    target: 'http://localhost:50400',
    auth: 'jwt',
  },
};
```

- [ ] **Step 3: Create Ko-fi plugin manifest**

```typescript
// projects/hiai-admin/app/src/lib/plugins/kofi.ts
import type { HiAiPlugin } from './types.js';

export const kofiPlugin: HiAiPlugin = {
  id: 'kofi',
  name: 'Ko-fi',
  version: '1.0.0',
  icon: '☕',
  description: 'Donation and tip integration',

  navGroups: [
    {
      items: [
        { label: 'Ko-fi', path: '/integrations/kofi', icon: '☕' },
      ],
    },
  ],

  proxy: {
    prefix: '/api/kofi',
    target: 'https://ko-fi.com/api/v1',
    auth: 'api-key',
  },
};
```

- [ ] **Step 4: Create Umami plugin manifest**

```typescript
// projects/hiai-admin/app/src/lib/plugins/umami.ts
import type { HiAiPlugin } from './types.js';

export const umamiPlugin: HiAiPlugin = {
  id: 'umami',
  name: 'Umami Analytics',
  version: '1.0.0',
  icon: '📊',
  description: 'Privacy-focused web analytics',

  navGroups: [
    {
      items: [
        { label: 'Umami', path: '/analytics/umami', icon: '📊' },
      ],
    },
  ],

  proxy: {
    prefix: '/api/umami',
    target: 'http://localhost:3000',
    auth: 'api-key',
  },
};
```

- [ ] **Step 5: Commit**

```bash
git add projects/hiai-admin/app/src/lib/plugins/
git commit -m "feat(hiai-admin): add plugin manifests for post, store, kofi, umami"
```

---

### Task 4: Register Plugins in App Init

**Files:**
- Modify: `projects/hiai-admin/app/src/routes/(admin)/+layout.server.ts`

- [ ] **Step 1: Register plugins in admin layout server load**

Read `projects/hiai-admin/app/src/routes/(admin)/+layout.server.ts`. Currently returns `{ user: locals.user }`. Modify to also register plugins and return nav groups.

```typescript
// projects/hiai-admin/app/src/routes/(admin)/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { registerPlugin, getNavGroups } from '$lib/plugins/registry.js';
import { hiaiPostPlugin } from '$lib/plugins/hiai-post.js';
import { hiaiStorePlugin } from '$lib/plugins/hiai-store.js';
import { kofiPlugin } from '$lib/plugins/kofi.js';
import { umamiPlugin } from '$lib/plugins/umami.js';

// Register all plugins (runs once per request on server)
registerPlugin(hiaiPostPlugin);
registerPlugin(hiaiStorePlugin);
registerPlugin(kofiPlugin);
registerPlugin(umamiPlugin);

export const load: LayoutServerLoad = async ({ locals, fetch }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  const res = await fetch('/api/users/me');
  if (res.ok) {
    const user = await res.json();
    if (user.role !== 'super_admin') {
      throw redirect(302, '/unauthorized');
    }
  }

  const navGroups = getNavGroups();
  return { user: locals.user, navGroups };
};
```

- [ ] **Step 2: Commit**

```bash
git add projects/hiai-admin/app/src/routes/\(admin\)/+layout.server.ts
git commit -m "feat(hiai-admin): register plugins in layout server load"
```

---

### Task 5: Refactor AdminSidebar for Dynamic Nav

**Files:**
- Modify: `projects/hiai-admin/app/src/lib/components/AdminSidebar.svelte`

- [ ] **Step 1: Refactor sidebar to accept navGroups from plugins**

Currently `AdminSidebar.svelte` has hardcoded `navItems`. Replace with dynamic nav from plugin registry.

```svelte
<!-- projects/hiai-admin/app/src/lib/components/AdminSidebar.svelte -->
<script lang="ts">
  import { page } from '$app/state';
  import type { NavGroup } from '$lib/plugins/types.js';

  let {
    navGroups = [],
    collapsed = false,
  }: {
    navGroups: NavGroup[];
    collapsed?: boolean;
  } = $props();
</script>

<aside
  class="flex flex-col border-r bg-muted/30 transition-all duration-200"
  class:w-64={!collapsed}
  class:w-16={collapsed}
>
  <div class="flex items-center justify-between p-4 border-b">
    {#if !collapsed}
      <span class="font-semibold text-lg">hiai-admin</span>
    {/if}
    <button onclick={() => {}} class="p-1 rounded hover:bg-muted" aria-label="Toggle sidebar">
      {collapsed ? '→' : '←'}
    </button>
  </div>

  <nav class="flex-1 p-2 space-y-4 overflow-y-auto">
    {#each navGroups as group}
      {#if group.label && !collapsed}
        <p class="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
          {group.label}
        </p>
      {/if}
      <div class="space-y-1">
        {#each group.items as item}
          <a
            href={item.path}
            class="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted"
            class:bg-muted={page.url.pathname.startsWith(item.path)}
            class:font-medium={page.url.pathname.startsWith(item.path)}
            title={item.label}
          >
            {#if item.icon}
              <span class="text-lg">{item.icon}</span>
            {/if}
            {#if !collapsed}
              <span class="flex-1">{item.label}</span>
              {#if item.badge !== undefined}
                <span class="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">{item.badge}</span>
              {/if}
            {/if}
          </a>
        {/each}
      </div>
    {/each}
  </nav>
</aside>
```

- [ ] **Step 2: Update admin layout to pass navGroups**

Modify `projects/hiai-admin/app/src/routes/(admin)/+layout.svelte` to pass `data.navGroups` to `AdminSidebar`.

```svelte
<!-- In the layout, change: -->
<AdminSidebar navGroups={data.navGroups ?? []} collapsed={sidebarCollapsed} />
```

- [ ] **Step 3: Commit**

```bash
git add projects/hiai-admin/app/src/lib/components/AdminSidebar.svelte projects/hiai-admin/app/src/routes/\(admin\)/+layout.svelte
git commit -m "feat(hiai-admin): refactor sidebar for dynamic plugin nav"
```

---

### Task 6: Implement API Proxy Catch-All Route

**Files:**
- Create: `projects/hiai-admin/app/src/routes/api/[plugin]/[...path]/+server.ts`

- [ ] **Step 1: Create SvelteKit proxy route**

```typescript
// projects/hiai-admin/app/src/routes/api/[plugin]/[...path]/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProxyConfig } from '$lib/plugins/registry.js';

async function proxyRequest(
  request: Request,
  pluginId: string,
  path: string
): Promise<Response> {
  const config = getProxyConfig(pluginId);
  if (!config) {
    return json({ error: `Plugin "${pluginId}" not found` }, { status: 404 });
  }

  const targetUrl = `${config.target}/${path}`;
  const headers = new Headers();

  // Forward content type
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  // Forward auth
  if (config.auth === 'jwt') {
    const auth = request.headers.get('authorization');
    if (auth) headers.set('authorization', auth);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  const response = await fetch(targetUrl, init);
  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
    },
  });
}

export const GET: RequestHandler = async ({ params, request }) => {
  return proxyRequest(request, params.plugin, params.path);
};

export const POST: RequestHandler = async ({ params, request }) => {
  return proxyRequest(request, params.plugin, params.path);
};

export const PUT: RequestHandler = async ({ params, request }) => {
  return proxyRequest(request, params.plugin, params.path);
};

export const DELETE: RequestHandler = async ({ params, request }) => {
  return proxyRequest(request, params.plugin, params.path);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  return proxyRequest(request, params.plugin, params.path);
};
```

- [ ] **Step 2: Commit**

```bash
git add projects/hiai-admin/app/src/routes/api/\[plugin\]/\[...path\]/
git commit -m "feat(hiai-admin): implement API proxy catch-all route"
```

---

### Task 7: Create Plugin Page Routes

**Files:**
- Create: `projects/hiai-admin/app/src/routes/(admin)/social/[...path]/+page.svelte`
- Create: `projects/hiai-admin/app/src/routes/(admin)/social/[...path]/+page.server.ts`
- Create: `projects/hiai-admin/app/src/routes/(admin)/shop/[...path]/+page.svelte`
- Create: `projects/hiai-admin/app/src/routes/(admin)/shop/[...path]/+page.server.ts`
- Create: `projects/hiai-admin/app/src/routes/(admin)/integrations/kofi/+page.svelte`
- Create: `projects/hiai-admin/app/src/routes/(admin)/analytics/umami/+page.svelte`

- [ ] **Step 1: Create social catch-all page**

The social routes proxy to hiai-post backend and render a generic page shell. The actual UI will be built incrementally.

```svelte
<!-- projects/hiai-admin/app/src/routes/(admin)/social/[...path]/+page.svelte -->
<script lang="ts">
  let { data } = $props();
</script>

<svelte:head>
  <title>{data.title ?? 'Social Media'} — hiai-admin</title>
</svelte:head>

<div class="space-y-6">
  <h1 class="text-2xl font-bold">{data.title ?? 'Social Media'}</h1>
  {#if data.error}
    <p class="text-destructive">{data.error}</p>
  {:else}
    <pre class="text-sm bg-muted p-4 rounded overflow-auto max-h-96">{JSON.stringify(data.items ?? data, null, 2)}</pre>
  {/if}
</div>
```

```typescript
// projects/hiai-admin/app/src/routes/(admin)/social/[...path]/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const path = params.path || 'dashboard';
  try {
    const res = await fetch(`/api/social/api/v1/${path}`);
    if (!res.ok) return { title: path, error: `API returned ${res.status}`, items: [] };
    const data = await res.json();
    return { title: path, ...data };
  } catch (e) {
    return { title: path, error: String(e), items: [] };
  }
};
```

- [ ] **Step 2: Create shop catch-all page**

Same pattern, proxying to hiai-store backend.

- [ ] **Step 3: Create Ko-fi integration page**

```svelte
<!-- projects/hiai-admin/app/src/routes/(admin)/integrations/kofi/+page.svelte -->
<script lang="ts">
  let { data } = $props();
  let webhookUrl = $state(data.webhookUrl ?? '');
  let verificationToken = $state(data.verificationToken ?? '');
</script>

<svelte:head><title>Ko-fi Integration — hiai-admin</title></svelte:head>

<div class="space-y-6 max-w-2xl">
  <h1 class="text-2xl font-bold">☕ Ko-fi Integration</h1>
  <div class="rounded-lg border bg-card p-6 space-y-4">
    <div>
      <label class="text-sm font-medium">Webhook URL</label>
      <input bind:value={webhookUrl} class="w-full mt-1 rounded border px-3 py-2 text-sm bg-background" placeholder="https://your-domain.com/api/kofi/webhook" />
    </div>
    <div>
      <label class="text-sm font-medium">Verification Token</label>
      <input bind:value={verificationToken} type="password" class="w-full mt-1 rounded border px-3 py-2 text-sm bg-background" />
    </div>
    <button class="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">Save</button>
  </div>
</div>
```

- [ ] **Step 4: Create Umami analytics page**

```svelte
<!-- projects/hiai-admin/app/src/routes/(admin)/analytics/umami/+page.svelte -->
<script lang="ts">
  let { data } = $props();
</script>

<svelte:head><title>Umami Analytics — hiai-admin</title></svelte:head>

<div class="space-y-6">
  <h1 class="text-2xl font-bold">📊 Umami Analytics</h1>
  {#if data.umamiUrl}
    <iframe
      src="{data.umamiUrl}/dashboard"
      class="w-full h-[800px] rounded-lg border"
      title="Umami Dashboard"
    ></iframe>
  {:else}
    <p class="text-muted-foreground">Configure UMAMI_URL in settings to view analytics.</p>
  {/if}
</div>
```

- [ ] **Step 5: Commit**

```bash
git add projects/hiai-admin/app/src/routes/\(admin\)/social/ projects/hiai-admin/app/src/routes/\(admin\)/shop/ projects/hiai-admin/app/src/routes/\(admin\)/integrations/ projects/hiai-admin/app/src/routes/\(admin\)/analytics/
git commit -m "feat(hiai-admin): add plugin page routes for social, shop, kofi, umami"
```

---

### Task 8: Verify Plugin System

- [ ] **Step 1: Verify TypeScript compiles**

```bash
cd ../app && bunx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 2: Run tests**

```bash
cd .. && bun test
```
Expected: 65+ pass / 0 fail

- [ ] **Step 3: Verify sidebar shows plugin nav items**

Start dev server and check that the sidebar shows groups for Social Media, E-Commerce, Ko-fi, Umami.

- [ ] **Step 4: Verify proxy route works**

```bash
# With hiai-post backend running on :50300
curl http://localhost:50201/api/social/api/v1/health
```
Expected: proxied response from hiai-post backend

- [ ] **Step 5: Commit any fixes**

```bash
git add -A && git commit -m "fix(hiai-admin): plugin system verification fixes"
```
