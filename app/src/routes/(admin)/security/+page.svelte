<script lang="ts">
  import StatusBadge from '$lib/components/StatusBadge.svelte';

  let { data } = $props();
  let sessions = data.sessions || [];
</script>

<svelte:head>
  <title>Security — hiai-admin</title>
</svelte:head>

<div class="space-y-6">
  <h1 class="text-2xl font-bold">Security</h1>

  <!-- 2FA Status -->
  <div class="rounded-lg border bg-card p-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold">Two-Factor Authentication</h2>
        <p class="text-sm text-muted-foreground mt-1">Secure your account with TOTP-based 2FA</p>
      </div>
      <StatusBadge status={data.user?.twoFactorEnabled ? 'active' : 'inactive'} />
    </div>
    <div class="mt-4">
      {#if data.user?.twoFactorEnabled}
        <p class="text-sm text-success">2FA is enabled on your account.</p>
        <a href="/settings/security" class="inline-block mt-2 text-sm text-primary hover:underline">Manage 2FA settings</a>
      {:else}
        <p class="text-sm text-warning">2FA is not enabled. We strongly recommend enabling it.</p>
        <a href="/settings/security" class="inline-block mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90">Enable 2FA</a>
      {/if}
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Active Sessions -->
    <div class="rounded-lg border bg-card p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">Active Sessions</h2>
        <span class="text-sm text-muted-foreground">{sessions.length} active</span>
      </div>
      <div class="space-y-3">
        {#each sessions as session}
          <div class="flex items-center justify-between p-3 rounded-md border">
            <div>
              <p class="text-sm font-medium">{session.userAgent || 'Unknown device'}</p>
              <p class="text-xs text-muted-foreground">IP: {session.ipAddress || 'Unknown'} · Last active: {session.lastActiveAt ? new Date(session.lastActiveAt).toLocaleString() : 'Now'}</p>
            </div>
            {#if !session.current}
              <button class="text-xs text-destructive hover:underline">Revoke</button>
            {:else}
              <span class="text-xs text-success font-medium">Current</span>
            {/if}
          </div>
        {:else}
          <p class="text-sm text-muted-foreground text-center py-4">No active sessions</p>
        {/each}
      </div>
    </div>

    <!-- Quick Links -->
    <div class="space-y-4">
      <a href="/security/audit" class="block rounded-lg border bg-card p-6 hover:shadow-md transition-shadow group">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold group-hover:text-primary transition-colors">Audit Logs</h2>
            <p class="text-sm text-muted-foreground mt-1">View all platform actions and changes</p>
          </div>
          <svg class="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </div>
      </a>
      <a href="/settings/security" class="block rounded-lg border bg-card p-6 hover:shadow-md transition-shadow group">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold group-hover:text-primary transition-colors">Security Settings</h2>
            <p class="text-sm text-muted-foreground mt-1">Configure 2FA, password policies, and session limits</p>
          </div>
          <svg class="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </div>
      </a>
      <div class="rounded-lg border bg-card p-6">
        <h2 class="text-lg font-semibold mb-3">Security Score</h2>
        <div class="flex items-center gap-4">
          <div class="relative w-20 h-20">
            <svg class="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
              <path class="text-muted" stroke="currentColor" fill="none" stroke-width="3" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path class="text-success" stroke="currentColor" fill="none" stroke-width="3" stroke-dasharray={`${data.securityScore || 75}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span class="absolute inset-0 flex items-center justify-center text-lg font-bold">{data.securityScore || 75}</span>
          </div>
          <div class="flex-1 space-y-1.5 text-sm">
            <div class="flex items-center gap-2"><span class="text-success">✓</span> Rate limiting enabled</div>
            <div class="flex items-center gap-2"><span class="text-success">✓</span> Audit logging active</div>
            <div class="flex items-center gap-2">
              <span class={data.user?.twoFactorEnabled ? 'text-success' : 'text-warning'}>{data.user?.twoFactorEnabled ? '✓' : '!'}</span>
              2FA {data.user?.twoFactorEnabled ? 'enabled' : 'not enabled'}
            </div>
            <div class="flex items-center gap-2"><span class="text-success">✓</span> Webhook signatures verified</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
