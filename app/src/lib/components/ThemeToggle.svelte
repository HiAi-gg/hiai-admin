<script lang="ts">
import { Sun, Moon } from 'lucide-svelte';

let dark = $state(false);

// biome-ignore lint/correctness/noUnusedVariables: used in template
function toggle() {
  dark = !dark;
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem('hiai-admin-theme', dark ? 'dark' : 'light');
}

$effect(() => {
  const saved = localStorage.getItem('hiai-admin-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  dark = saved === 'dark' || (!saved && prefersDark);
  document.documentElement.classList.toggle('dark', dark);
});
</script>

<button
  onclick={toggle}
  class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm hover:bg-accent hover:text-accent-foreground"
  aria-label="Toggle theme"
>
  {#if dark}
    <Sun class="h-4 w-4" />
  {:else}
    <Moon class="h-4 w-4" />
  {/if}
</button>
