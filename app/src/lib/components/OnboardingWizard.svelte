<script lang="ts">
let { slug, siteName }: { slug: string; siteName: string } = $props();

// Steps are visually marked done as the user advances through them.
// Step 2 is implicitly "done" once the site has blocks (parent hides the wizard).
let done = $state<Record<1 | 2 | 3, boolean>>({ 1: false, 2: false, 3: false });

const publicBase = (import.meta.env.PUBLIC_SITE_BASE_URL ?? '').replace(/\/$/, '');
const publicSiteUrl = publicBase ? `${publicBase}/${slug}` : null;

const steps = $derived([
  {
    n: 1 as const,
    title: 'Name your site',
    description: `Give "${siteName}" a memorable name visitors will see.`,
    href: `/sites/${slug}/edit`,
    cta: 'Go to settings',
  },
  {
    n: 2 as const,
    title: 'Add your first block',
    description: 'Build your homepage by adding your first content block.',
    href: `/sites/${slug}/homepage`,
    cta: 'Open homepage editor',
  },
  {
    n: 3 as const,
    title: 'View your site',
    description: publicSiteUrl
      ? 'Open your published site to see it live.'
      : 'You are all set. Come back here anytime to manage your site.',
    href: publicSiteUrl ?? null,
    cta: publicSiteUrl ? 'View site' : 'Finish',
    external: !!publicSiteUrl,
  },
]);

const completedCount = $derived(Object.values(done).filter(Boolean).length);
const progressPct = $derived(Math.round((completedCount / 3) * 100));

function toggle(n: 1 | 2 | 3) {
  done[n] = !done[n];
}

function markDone(n: 1 | 2 | 3) {
  done[n] = true;
}
</script>

<section
  aria-label="Onboarding wizard"
  class="rounded-md border bg-muted/40 p-4"
  data-testid="onboarding-wizard"
>
  <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
    <div>
      <h2 class="text-sm font-semibold">Get started with your site</h2>
      <p class="mt-0.5 text-xs text-muted-foreground">
        Step {Math.min(completedCount + (done[1] && done[2] && done[3] ? 0 : 1), 3)} of 3
      </p>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-xs tabular-nums text-muted-foreground">{progressPct}%</span>
      <div
        class="h-1.5 w-32 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={progressPct}
      >
        <div
          class="h-full bg-primary transition-all"
          style="width: {progressPct}%"
        ></div>
      </div>
    </div>
  </div>

  <ul class="space-y-2">
    {#each steps as step (step.n)}
      {@const isDone = done[step.n]}
      <li
        class="flex flex-wrap items-center gap-3 rounded-md border bg-background px-3 py-2.5"
        class:opacity-60={isDone}
      >
        <div
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold"
          class:bg-success={isDone}
          class:text-success-foreground={isDone}
          class:border-success={isDone}
          class:bg-background={!isDone}
          class:text-muted-foreground={!isDone}
          class:border-border={!isDone}
          aria-hidden="true"
        >
          {isDone ? '✓' : step.n}
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-sm font-medium">{step.title}</div>
          <div class="text-xs text-muted-foreground">{step.description}</div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <label class="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              class="h-3.5 w-3.5 rounded border-border"
              checked={isDone}
              onchange={() => toggle(step.n)}
              aria-label="Mark step {step.n} done"
            />
            Done
          </label>
          {#if step.href}
            <a
              href={step.href}
              target={step.external ? '_blank' : undefined}
              rel={step.external ? 'noopener noreferrer' : undefined}
              onclick={() => markDone(step.n)}
              class="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              {step.cta} <span aria-hidden="true">→</span>
            </a>
          {:else}
            <button
              type="button"
              onclick={() => toggle(step.n)}
              class="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              {step.cta}
            </button>
          {/if}
        </div>
      </li>
    {/each}
  </ul>
</section>