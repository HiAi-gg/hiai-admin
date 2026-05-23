<script lang="ts">
  let { data } = $props();
</script>

<svelte:head><title>Settings — hiai-admin</title></svelte:head>

<div class="space-y-6">
  <h1 class="text-2xl font-bold">Platform Settings</h1>
  <div class="rounded-lg border bg-card p-6">
    <p class="text-muted-foreground">Global platform settings editor. Configure platform name, timezone, feature flags, and rate limits.</p>
    <div class="mt-4 space-y-4">
      <div class="flex items-center justify-between p-4 border rounded">
        <div>
          <div class="font-medium">Platform Name</div>
          <div class="text-sm text-muted-foreground">Display name for the HiAi platform</div>
        </div>
        <span class="text-muted-foreground">HiAi</span>
      </div>
      <div class="flex items-center justify-between p-4 border rounded">
        <div>
          <div class="font-medium">Default Timezone</div>
          <div class="text-sm text-muted-foreground">Default timezone for new tenants</div>
        </div>
        <span class="text-muted-foreground">UTC</span>
      </div>
    </div>
  </div>
</div>
