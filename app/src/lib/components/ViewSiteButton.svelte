<script lang="ts">
  // biome-ignore lint/correctness/noUnusedVariables: used in template
  let { href }: { href?: string | null } = $props();
</script>

{#if href}
  <a
    {href}
    target="_blank"
    rel="noopener noreferrer"
    class="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-muted"
  >
    View site ↗
  </a>
{/if}