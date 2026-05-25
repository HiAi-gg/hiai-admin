<script lang="ts">
  import type { LayoutData } from './$types';
  import AdminSidebar from '$lib/components/AdminSidebar.svelte';
  import AdminHeader from '$lib/components/AdminHeader.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';

  let { data, children } = $props<{ data: LayoutData; children: Snippet }>();
  let sidebarCollapsed = $state(false);

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
  }
</script>

<div class="flex h-screen overflow-hidden bg-background">
  <AdminSidebar collapsed={sidebarCollapsed} />

  <div class="flex flex-1 flex-col overflow-hidden">
    <AdminHeader user={data.user} onToggleSidebar={toggleSidebar}>
      {#snippet actions()}
        <ThemeToggle />
      {/snippet}
    </AdminHeader>

    <main class="flex-1 overflow-y-auto p-6">
      {@render children()}
    </main>
  </div>
</div>
