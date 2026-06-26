<script lang="ts">
import type { PageData } from './$types';
import { invalidateAll } from '$app/navigation';

let { data }: { data: PageData } = $props();

let name = $state(data.profile?.name ?? data.sessionUser?.name ?? '');
let email = $state(data.profile?.email ?? data.sessionUser?.email ?? '');
let currentPassword = $state('');
let newPassword = $state('');
let confirmPassword = $state('');

// biome-ignore lint/correctness/noUnusedVariables: used in template
let savingProfile = $state(false);
// biome-ignore lint/correctness/noUnusedVariables: used in template
let savingPassword = $state(false);
let profileMessage = $state('');
let passwordMessage = $state('');

// --- Avatar upload state ---
let avatarFile = $state<File | null>(null);
let avatarPreview = $state<string | null>(null);
let uploadingAvatar = $state(false);
let avatarMessage = $state('');
const MAX_AVATAR_BYTES = 1024 * 1024; // 1 MB
const ACCEPTED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

function onAvatarSelected(event: Event) {
  avatarMessage = '';
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) {
    avatarFile = null;
    avatarPreview = null;
    return;
  }
  if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
    avatarMessage = 'Unsupported image type. Use PNG, JPEG, WebP, or GIF.';
    target.value = '';
    return;
  }
  if (file.size > MAX_AVATAR_BYTES) {
    avatarMessage = `Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB; max 1 MB).`;
    target.value = '';
    return;
  }
  avatarFile = file;
  // Revoke any prior object URL to avoid leaking memory between previews.
  if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  avatarPreview = URL.createObjectURL(file);
}

// biome-ignore lint/correctness/noUnusedVariables: form submit handler
async function uploadAvatar() {
  if (!avatarFile) {
    avatarMessage = 'Choose an image first.';
    return;
  }
  uploadingAvatar = true;
  avatarMessage = '';
  try {
    const form = new FormData();
    form.append('file', avatarFile);
    const res = await fetch('/api/profile/avatar', {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to upload avatar');
    }
    avatarMessage = 'Avatar uploaded';
    // Refresh server-loaded profile data so the header avatar refreshes too.
    await invalidateAll();
    setTimeout(() => (avatarMessage = ''), 3000);
  } catch (err) {
    avatarMessage = err instanceof Error ? err.message : 'Failed to upload avatar';
  } finally {
    uploadingAvatar = false;
  }
}

const profile = $derived(data.profile);
// biome-ignore lint/correctness/noUnusedVariables: used in template
const tenants = $derived(data.tenants ?? []);

// biome-ignore lint/correctness/noUnusedVariables: form submit handler
async function saveProfile(event: Event) {
  event.preventDefault();
  savingProfile = true;
  profileMessage = '';
  try {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to save profile');
    }
    profileMessage = 'Profile saved';
    setTimeout(() => (profileMessage = ''), 3000);
  } catch (err) {
    profileMessage = err instanceof Error ? err.message : 'Failed to save profile';
  } finally {
    savingProfile = false;
  }
}

// biome-ignore lint/correctness/noUnusedVariables: form submit handler
async function changePassword(event: Event) {
  event.preventDefault();
  passwordMessage = '';
  if (newPassword !== confirmPassword) {
    passwordMessage = 'New passwords do not match';
    return;
  }
  if (newPassword.length < 8) {
    passwordMessage = 'New password must be at least 8 characters';
    return;
  }
  savingPassword = true;
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? body.message ?? 'Failed to change password');
    }
    passwordMessage = 'Password updated';
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
    setTimeout(() => (passwordMessage = ''), 3000);
  } catch (err) {
    passwordMessage = err instanceof Error ? err.message : 'Failed to change password';
  } finally {
    savingPassword = false;
  }
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
function initials(): string {
  const source = (profile?.name ?? data.sessionUser?.name ?? '').trim();
  if (!source) return 'U';
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
</script>

<svelte:head>
  <title>Profile — hiai-admin</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
  <header>
    <h1 class="text-2xl font-bold">Your profile</h1>
    <p class="text-muted-foreground">Manage your account details and security.</p>
  </header>

  <section class="rounded-lg border bg-card p-6">
    <div class="flex items-center gap-4">
      {#if avatarPreview}
        <img
          src={avatarPreview}
          alt="Avatar preview"
          class="h-16 w-16 rounded-full object-cover ring-2 ring-primary"
        />
      {:else if profile?.avatarUrl}
        <img
          src={profile.avatarUrl}
          alt={profile.name ?? 'Avatar'}
          class="h-16 w-16 rounded-full object-cover"
        />
      {:else}
        <div
          class="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-semibold"
        >
          {initials()}
        </div>
      {/if}
      <div class="space-y-1">
        <div class="text-lg font-semibold">{profile?.name ?? data.sessionUser?.name ?? 'User'}</div>
        <div class="text-sm text-muted-foreground">{profile?.email ?? data.sessionUser?.email ?? ''}</div>
        <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span
            class="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 font-medium"
          >
            {profile?.role ?? data.sessionUser?.role ?? 'viewer'}
          </span>
          <span>
            2FA:
            <span
              class={profile?.twoFactorEnabled ? 'text-success' : 'text-muted-foreground'}
            >
              {profile?.twoFactorEnabled ? 'enabled' : 'disabled'}
            </span>
          </span>
          {#if profile?.lastLoginAt}
            <span>· last login {new Date(profile.lastLoginAt).toLocaleString()}</span>
          {/if}
        </div>
      </div>
    </div>

    <div class="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center">
      <label class="flex-1">
        <span class="sr-only">Choose avatar image</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onchange={onAvatarSelected}
          class="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
        />
      </label>
      <div class="flex items-center gap-3">
        {#if avatarMessage}
          <span
            class="text-xs"
            class:text-success={!avatarMessage.startsWith('Unsupported') &&
              !avatarMessage.startsWith('Image too large') &&
              !avatarMessage.startsWith('Choose') &&
              !avatarMessage.startsWith('Failed')}
            class:text-destructive={avatarMessage.startsWith('Unsupported') ||
              avatarMessage.startsWith('Image too large') ||
              avatarMessage.startsWith('Failed')}
          >
            {avatarMessage}
          </span>
        {/if}
        <button
          type="button"
          onclick={uploadAvatar}
          disabled={!avatarFile || uploadingAvatar}
          class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {uploadingAvatar ? 'Uploading…' : 'Upload avatar'}
        </button>
      </div>
    </div>
  </section>

  <section class="rounded-lg border bg-card">
    <header class="border-b p-4">
      <h2 class="text-lg font-semibold">Account details</h2>
      <p class="text-xs text-muted-foreground">Update your name and email.</p>
    </header>
    <form onsubmit={saveProfile} class="space-y-4 p-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <label for="profile-name" class="block text-sm font-medium">Name</label>
          <input
            id="profile-name"
            type="text"
            bind:value={name}
            required
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div class="space-y-1.5">
          <label for="profile-email" class="block text-sm font-medium">Email</label>
          <input
            id="profile-email"
            type="email"
            bind:value={email}
            required
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div class="flex items-center justify-end gap-3">
        {#if profileMessage}
          <span
            class="text-xs"
            class:text-success={!profileMessage.startsWith('Failed')}
            class:text-destructive={profileMessage.startsWith('Failed')}
          >
            {profileMessage}
          </span>
        {/if}
        <button
          type="submit"
          disabled={savingProfile}
          class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {savingProfile ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  </section>

  <section class="rounded-lg border bg-card">
    <header class="border-b p-4">
      <h2 class="text-lg font-semibold">Password</h2>
      <p class="text-xs text-muted-foreground">Choose a strong password (min 8 characters).</p>
    </header>
    <form onsubmit={changePassword} class="space-y-4 p-4">
      <div class="space-y-1.5">
        <label for="profile-current-password" class="block text-sm font-medium">
          Current password
        </label>
        <input
          id="profile-current-password"
          type="password"
          bind:value={currentPassword}
          autocomplete="current-password"
          required
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <label for="profile-new-password" class="block text-sm font-medium">New password</label>
          <input
            id="profile-new-password"
            type="password"
            bind:value={newPassword}
            autocomplete="new-password"
            required
            minlength={8}
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div class="space-y-1.5">
          <label for="profile-confirm-password" class="block text-sm font-medium">
            Confirm new password
          </label>
          <input
            id="profile-confirm-password"
            type="password"
            bind:value={confirmPassword}
            autocomplete="new-password"
            required
            minlength={8}
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div class="flex items-center justify-end gap-3">
        {#if passwordMessage}
          <span
            class="text-xs"
            class:text-success={!passwordMessage.startsWith('Failed') &&
              !passwordMessage.startsWith('New passwords') &&
              !passwordMessage.startsWith('New password')}
            class:text-destructive={passwordMessage.startsWith('Failed') ||
              passwordMessage.startsWith('New passwords') ||
              passwordMessage.startsWith('New password')}
          >
            {passwordMessage}
          </span>
        {/if}
        <button
          type="submit"
          disabled={savingPassword}
          class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {savingPassword ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </form>
  </section>

  <section class="rounded-lg border bg-card">
    <header class="border-b p-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold">Tenants</h2>
          <p class="text-xs text-muted-foreground">
            Tenants you have explicit access to. Join another with its slug.
          </p>
        </div>
        <a
          href="/profile/tenants"
          class="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
        >
          Manage tenants →
        </a>
      </div>
    </header>
    <div class="divide-y">
      {#if tenants.length === 0}
        <div class="p-6 text-center text-sm text-muted-foreground">
          You're not a member of any tenant yet.
        </div>
      {:else}
        {#each tenants as tenant (tenant.tenantId)}
          <div class="flex items-center justify-between p-4">
            <div>
              <div class="font-medium text-sm">{tenant.name}</div>
              <div class="text-xs text-muted-foreground">
                <code>{tenant.slug}</code> · {tenant.plan} · {tenant.status}
              </div>
            </div>
            <span
              class="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs"
            >
              {tenant.role}
            </span>
          </div>
        {/each}
      {/if}
    </div>
  </section>
</div>