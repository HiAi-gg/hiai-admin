<script lang="ts">
import '../app.css';
import type { Snippet } from 'svelte';

// biome-ignore lint/correctness/noUnusedVariables: used in template
let { children }: { children: Snippet } = $props();
</script>

{@render children()}
