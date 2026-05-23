<script lang="ts">
</script>

<svelte:head><title>Security — hiai-admin</title></svelte:head>

<div class="space-y-6">
  <h1 class="text-2xl font-bold">Security</h1>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <a href="/security/audit" class="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow">
      <h2 class="font-semibold">Audit Logs</h2>
      <p class="text-sm text-muted-foreground mt-1">View all platform actions and changes</p>
    </a>
    <div class="rounded-lg border bg-card p-6">
      <h2 class="font-semibold">2FA Status</h2>
      <p class="text-sm text-muted-foreground mt-1">Manage two-factor authentication</p>
    </div>
  </div>
</div>
