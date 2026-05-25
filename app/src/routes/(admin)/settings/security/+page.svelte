<script lang="ts">
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';

  let { data } = $props();
  let twoFactorEnabled = $state(data.user?.twoFactorEnabled ?? false);
  let showDisableModal = $state(false);
  let showSetupModal = $state(false);
  let qrCode = $state('');
  let verificationCode = $state('');
  let sessions = $state(data.sessions || []);

  async function enable2FA() {
    const res = await fetch('/api/users/me/2fa/enable', { method: 'POST' });
    const result = await res.json();
    qrCode = result.qrCode;
    showSetupModal = true;
  }

  async function verify2FA() {
    const res = await fetch('/api/users/me/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: verificationCode })
    });
    if (res.ok) {
      twoFactorEnabled = true;
      showSetupModal = false;
      verificationCode = '';
    }
  }

  async function disable2FA() {
    await fetch('/api/users/me/2fa/disable', { method: 'POST' });
    twoFactorEnabled = false;
    showDisableModal = false;
  }

  async function revokeSession(sessionId: string) {
    await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
    sessions = sessions.filter((s: { id: string }) => s.id !== sessionId);
  }
</script>

<svelte:head><title>Security — hiai-admin</title></svelte:head>

<div class="space-y-6 max-w-2xl">
  <h1 class="text-2xl font-bold">Security Settings</h1>

  <!-- 2FA Section -->
  <div class="rounded-lg border bg-card p-6">
    <h2 class="text-lg font-semibold mb-2">Two-Factor Authentication</h2>
    <p class="text-sm text-muted-foreground mb-4">Add an extra layer of security to your account with TOTP-based 2FA.</p>

    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-3 h-3 rounded-full {twoFactorEnabled ? 'bg-success' : 'bg-muted-foreground'}"></div>
        <span class="font-medium">{twoFactorEnabled ? 'Enabled' : 'Disabled'}</span>
      </div>
      {#if twoFactorEnabled}
        <button onclick={() => showDisableModal = true} class="px-4 py-2 rounded border border-destructive text-destructive text-sm hover:bg-destructive/10">
          Disable 2FA
        </button>
      {:else}
        <button onclick={enable2FA} class="px-4 py-2 rounded bg-primary text-primary-foreground text-sm hover:opacity-90">
          Enable 2FA
        </button>
      {/if}
    </div>
  </div>

  <!-- Active Sessions -->
  <div class="rounded-lg border bg-card p-6">
    <h2 class="text-lg font-semibold mb-4">Active Sessions</h2>
    <div class="space-y-3">
      {#each sessions as session}
        <div class="flex items-center justify-between p-3 rounded bg-muted/50">
          <div>
            <p class="text-sm font-medium">{session.userAgent || 'Unknown device'}</p>
            <p class="text-xs text-muted-foreground">IP: {session.ipAddress || 'Unknown'} · Last active: {new Date(session.updatedAt).toLocaleString()}</p>
          </div>
          <button onclick={() => revokeSession(session.id)} class="text-xs text-destructive hover:underline">Revoke</button>
        </div>
      {/each}
      {#if sessions.length === 0}
        <p class="text-sm text-muted-foreground">No active sessions</p>
      {/if}
    </div>
  </div>
</div>

<!-- 2FA Setup Modal -->
{#if showSetupModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="bg-card rounded-lg border p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-semibold mb-4">Set Up 2FA</h3>
      {#if qrCode}
        <div class="flex justify-center mb-4">
          <img src={qrCode} alt="QR Code" class="w-48 h-48" />
        </div>
        <p class="text-sm text-muted-foreground mb-4">Scan this QR code with your authenticator app, then enter the verification code below.</p>
      {/if}
      <div class="space-y-4">
        <input
          type="text"
          bind:value={verificationCode}
          placeholder="Enter 6-digit code"
          class="w-full px-3 py-2 border rounded-lg text-center text-lg tracking-widest"
          maxlength="6"
        />
        <div class="flex gap-2">
          <button onclick={verify2FA} class="flex-1 px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90">Verify</button>
          <button onclick={() => showSetupModal = false} class="flex-1 px-4 py-2 rounded border hover:bg-muted">Cancel</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Disable 2FA Modal -->
{#if showDisableModal}
  <ConfirmModal
    title="Disable 2FA"
    message="Are you sure you want to disable two-factor authentication? Your account will be less secure."
    onConfirm={disable2FA}
    onCancel={() => showDisableModal = false}
  />
{/if}
