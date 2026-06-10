<script lang="ts">
let dark = $state(false);

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
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
  {:else}
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
  {/if}
</button>
