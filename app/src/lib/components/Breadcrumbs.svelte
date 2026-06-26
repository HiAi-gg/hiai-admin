<script lang="ts">
interface Crumb {
  label: string;
  href?: string;
}

let { items }: { items: Crumb[] } = $props();
</script>

<nav aria-label="Breadcrumb" class="text-sm text-muted-foreground">
  <ol class="flex flex-wrap items-center gap-1.5">
    {#each items as item, i (i)}
      {#if i > 0}
        <li aria-hidden="true" class="text-muted-foreground/60">/</li>
      {/if}
      <li>
        {#if item.href && i < items.length - 1}
          <a href={item.href} class="hover:underline hover:text-foreground">{item.label}</a>
        {:else}
          <span aria-current="page">{item.label}</span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>
