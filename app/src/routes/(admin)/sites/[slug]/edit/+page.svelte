<script lang="ts">
import { enhance } from '$app/forms';
import { untrack } from 'svelte';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@hiai/ui/components/ui/tabs/index.js';
import { Switch } from '@hiai/ui/components/ui/switch/index.js';

type SocialLink = { platform: string; url: string };

let { data, form } = $props();

const site = $derived(data.site);

// Active tab. Defaults to 'general' but can be overridden by ?tab=.
let activeTab = $state('general');

// Echo of form values on error, otherwise the loaded site data.
const source = $derived((form?.values as Record<string, unknown> | undefined) ?? data.site);

// Text fields — captured once from initial data via untrack to avoid
// `state_referenced_locally` warnings.
let description = $state(untrack(() => (data.site?.description as string) ?? ''));
let bio = $state(untrack(() => (data.site?.bio as string) ?? ''));

// Social links as an editable array. Seeded from the loaded site data.
let socialLinks = $state<SocialLink[]>(
  untrack(() =>
    Array.isArray(data.site?.socialLinks)
      ? (data.site.socialLinks as SocialLink[]).map((l) => ({ ...l }))
      : [],
  ),
);

// Toggle state derived from data (read-only on first render; user toggles via Switch).
let darkModeEnabled = $state(untrack(() => Boolean(data.site?.darkModeEnabled)));
let articlesPageVisible = $state(untrack(() => Boolean(data.site?.articlesPageVisible)));
let scrollToTopEnabled = $state(untrack(() => Boolean(data.site?.scrollToTopEnabled)));
let contactEmailEnabled = $state(untrack(() => Boolean(data.site?.contactEmailEnabled)));
let kofiEnabled = $state(untrack(() => Boolean(data.site?.kofiEnabled)));

function addSocialLink() {
  socialLinks = [...socialLinks, { platform: 'Website', url: '' }];
}

function removeSocialLink(i: number) {
  socialLinks = socialLinks.filter((_, idx) => idx !== i);
}

function selectTab(value: string) {
  activeTab = value;
}

// JSON snapshot used by the hidden input on submit. Recomputed whenever the
// socialLinks array changes so the form payload stays in sync.
const socialLinksJson = $derived(JSON.stringify(socialLinks));
</script>

<svelte:head>
  <title>Edit {data.slug} — hiai-admin</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Edit site</h1>
      <p class="text-sm text-muted-foreground">{data.slug}</p>
    </div>
    <a href={`/sites/${data.slug}`} class="text-sm text-muted-foreground hover:underline">
      ← Back to site
    </a>
  </div>

  {#if data.error}
    <div
      class="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {data.error}
    </div>
  {:else if site}
    {#if form?.error}
      <div
        class="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
      >
        {form.error}
      </div>
    {/if}
    {#if form?.success}
      <div
        class="rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm text-success"
      >
        Settings saved successfully.
      </div>
    {/if}

    <form method="POST" use:enhance class="space-y-6">
      <!-- Hidden field carrying the current socialLinks array as JSON. -->
      <input type="hidden" name="socialLinks" value={socialLinksJson} />

      <Tabs bind:value={activeTab}>
        <TabsList>
          <TabsTrigger value="general" selected={activeTab === 'general'} onclick={selectTab}>
            General
          </TabsTrigger>
          <TabsTrigger value="profile" selected={activeTab === 'profile'} onclick={selectTab}>
            Profile
          </TabsTrigger>
          <TabsTrigger value="theme" selected={activeTab === 'theme'} onclick={selectTab}>
            Theme
          </TabsTrigger>
          <TabsTrigger value="social" selected={activeTab === 'social'} onclick={selectTab}>
            Social
          </TabsTrigger>
          <TabsTrigger value="features" selected={activeTab === 'features'} onclick={selectTab}>
            Features
          </TabsTrigger>
        </TabsList>

        <!-- Tab 1: General -->
        <TabsContent value="general" currentValue={activeTab}>
          <div class="space-y-4 rounded-md border bg-muted/40 p-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="space-y-1">
                <span class="text-sm font-medium">Name</span>
                <input
                  name="name"
                  value={(source?.name as string) ?? ''}
                  placeholder="Site name"
                  class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label class="space-y-1">
                <span class="text-sm font-medium">Slug</span>
                <input
                  value={site.slug}
                  readonly
                  disabled
                  class="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 font-mono text-sm text-muted-foreground"
                />
              </label>
              <label class="space-y-1">
                <span class="text-sm font-medium">Status</span>
                <select
                  name="status"
                  value={(source?.status as string) ?? 'active'}
                  class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  {#each data.statuses as s (s)}
                    <option value={s}>{s}</option>
                  {/each}
                </select>
              </label>
              <label class="space-y-1">
                <span class="text-sm font-medium">Default Language</span>
                <select
                  name="defaultLanguage"
                  value={(source?.defaultLanguage as string) ?? 'en'}
                  class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  {#each data.languages as l (l)}
                    <option value={l}>{l}</option>
                  {/each}
                </select>
              </label>
            </div>

            <label class="block space-y-1">
              <span class="text-sm font-medium">Description</span>
              <textarea
                name="description"
                bind:value={description}
                rows={4}
                placeholder="Short site description"
                class="w-full rounded-md border border-input bg-background p-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              ></textarea>
            </label>
          </div>
        </TabsContent>

        <!-- Tab 2: Profile -->
        <TabsContent value="profile" currentValue={activeTab}>
          <div class="space-y-4 rounded-md border bg-muted/40 p-4">
            <label class="block space-y-1">
              <span class="text-sm font-medium">Avatar URL</span>
              <input
                name="avatarUrl"
                type="url"
                value={(source?.avatarUrl as string) ?? ''}
                placeholder="https://example.com/avatar.png"
                class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {#if (source?.avatarUrl as string | undefined)}
                <img
                  src={source?.avatarUrl as string}
                  alt="Avatar preview"
                  class="mt-2 h-16 w-16 rounded-full border object-cover"
                />
              {/if}
            </label>
            <label class="block space-y-1">
              <span class="text-sm font-medium">Display Name</span>
              <input
                name="displayName"
                value={(source?.displayName as string) ?? ''}
                placeholder="Public display name"
                class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label class="block space-y-1">
              <span class="text-sm font-medium">
                Bio
                <span class="text-xs text-muted-foreground">(~200 chars)</span>
              </span>
              <textarea
                name="bio"
                bind:value={bio}
                rows={3}
                maxlength={200}
                placeholder="A short bio shown on your public profile"
                class="w-full rounded-md border border-input bg-background p-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              ></textarea>
            </label>
          </div>
        </TabsContent>

        <!-- Tab 3: Theme -->
        <TabsContent value="theme" currentValue={activeTab}>
          <div class="space-y-4 rounded-md border bg-muted/40 p-4">
            <label class="block space-y-1">
              <span class="text-sm font-medium">Theme Preset</span>
              <select
                name="theme"
                value={(source?.theme as string) ?? 'default'}
                class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                {#each data.themes as t (t)}
                  <option value={t}>{t}</option>
                {/each}
              </select>
            </label>

            <div class="grid gap-4 sm:grid-cols-2">
              <label class="space-y-1">
                <span class="text-sm font-medium">Primary Color</span>
                <div class="flex items-center gap-2">
                  <input
                    name="primaryColor"
                    type="color"
                    value={(source?.primaryColor as string) ?? '#20b2aa'}
                    title="Maps to var(--color-primary)"
                    class="h-9 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
                  />
                  <input
                    type="text"
                    value={(source?.primaryColor as string) ?? '#20b2aa'}
                    readonly
                    title="Maps to var(--color-primary)"
                    class="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 font-mono text-xs text-muted-foreground"
                  />
                </div>
              </label>
              <label class="space-y-1">
                <span class="text-sm font-medium">Secondary Color</span>
                <div class="flex items-center gap-2">
                  <input
                    name="secondaryColor"
                    type="color"
                    value={(source?.secondaryColor as string) ?? '#f1f5f9'}
                    title="Maps to var(--color-secondary)"
                    class="h-9 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
                  />
                  <input
                    type="text"
                    value={(source?.secondaryColor as string) ?? '#f1f5f9'}
                    readonly
                    title="Maps to var(--color-secondary)"
                    class="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 font-mono text-xs text-muted-foreground"
                  />
                </div>
              </label>
              <label class="space-y-1">
                <span class="text-sm font-medium">Accent Color</span>
                <div class="flex items-center gap-2">
                  <input
                    name="accentColor"
                    type="color"
                    value={(source?.accentColor as string) ?? '#3b82f6'}
                    title="Maps to var(--color-info)"
                    class="h-9 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
                  />
                  <input
                    type="text"
                    value={(source?.accentColor as string) ?? '#3b82f6'}
                    readonly
                    title="Maps to var(--color-info)"
                    class="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 font-mono text-xs text-muted-foreground"
                  />
                </div>
              </label>
              <label class="space-y-1">
                <span class="text-sm font-medium">Background Color</span>
                <div class="flex items-center gap-2">
                  <input
                    name="backgroundColor"
                    type="color"
                    value={(source?.backgroundColor as string) ?? '#ffffff'}
                    title="Maps to var(--color-background)"
                    class="h-9 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
                  />
                  <input
                    type="text"
                    value={(source?.backgroundColor as string) ?? '#ffffff'}
                    readonly
                    title="Maps to var(--color-background)"
                    class="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 font-mono text-xs text-muted-foreground"
                  />
                </div>
              </label>
            </div>

            <div class="flex items-center justify-between rounded-md border bg-background px-3 py-2">
              <div>
                <div class="text-sm font-medium">Dark Mode</div>
                <div class="text-xs text-muted-foreground">Enable dark theme by default.</div>
              </div>
              <Switch
                bind:checked={darkModeEnabled}
                ariaLabel="Toggle dark mode"
              />
              <input type="hidden" name="darkModeEnabled" value={darkModeEnabled ? 'true' : 'false'} />
            </div>

            <label class="block space-y-1">
              <span class="text-sm font-medium">Logo URL</span>
              <input
                name="logoUrl"
                type="url"
                value={(source?.logoUrl as string) ?? ''}
                placeholder="https://example.com/logo.png"
                class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </div>
        </TabsContent>

        <!-- Tab 4: Social -->
        <TabsContent value="social" currentValue={activeTab}>
          <div class="space-y-4 rounded-md border bg-muted/40 p-4">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm font-medium">Social Links</div>
                <div class="text-xs text-muted-foreground">
                  Add links shown on your public profile.
                </div>
              </div>
              <button
                type="button"
                onclick={addSocialLink}
                class="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
              >
                + Add link
              </button>
            </div>

            {#if socialLinks.length === 0}
              <p class="text-sm text-muted-foreground">No social links yet.</p>
            {:else}
              <div class="space-y-2">
                {#each socialLinks as link, i (i)}
                  <div class="flex items-center gap-2">
                    <select
                      bind:value={link.platform}
                      class="flex h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    >
                      {#each data.socialPlatforms as p (p)}
                        <option value={p}>{p}</option>
                      {/each}
                    </select>
                    <input
                      type="url"
                      bind:value={link.url}
                      placeholder="https://..."
                      class="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <button
                      type="button"
                      onclick={() => removeSocialLink(i)}
                      class="inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium hover:bg-muted"
                    >
                      Remove
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </TabsContent>

        <!-- Tab 5: Features -->
        <TabsContent value="features" currentValue={activeTab}>
          <div class="space-y-3 rounded-md border bg-muted/40 p-4">
            <div class="flex items-center justify-between rounded-md border bg-background px-3 py-2">
              <div>
                <div class="text-sm font-medium">Articles Page Visible</div>
                <div class="text-xs text-muted-foreground">Show the public articles page.</div>
              </div>
              <Switch
                bind:checked={articlesPageVisible}
                ariaLabel="Toggle articles page visibility"
              />
              <input
                type="hidden"
                name="articlesPageVisible"
                value={articlesPageVisible ? 'true' : 'false'}
              />
            </div>

            <div class="flex items-center justify-between rounded-md border bg-background px-3 py-2">
              <div>
                <div class="text-sm font-medium">Scroll-to-Top Button</div>
                <div class="text-xs text-muted-foreground">
                  Show a floating button to scroll back to top.
                </div>
              </div>
              <Switch
                bind:checked={scrollToTopEnabled}
                ariaLabel="Toggle scroll-to-top button"
              />
              <input
                type="hidden"
                name="scrollToTopEnabled"
                value={scrollToTopEnabled ? 'true' : 'false'}
              />
            </div>

            <div class="rounded-md border bg-background px-3 py-2">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium">Contact Email</div>
                  <div class="text-xs text-muted-foreground">
                    Show a contact email link on your public profile.
                  </div>
                </div>
                <Switch
                  bind:checked={contactEmailEnabled}
                  ariaLabel="Toggle contact email"
                />
                <input
                  type="hidden"
                  name="contactEmailEnabled"
                  value={contactEmailEnabled ? 'true' : 'false'}
                />
              </div>
              {#if contactEmailEnabled}
                <input
                  name="contactEmail"
                  type="email"
                  value={(source?.contactEmail as string) ?? ''}
                  placeholder="you@example.com"
                  class="mt-3 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              {/if}
            </div>

            <div class="rounded-md border bg-background px-3 py-2">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium">Ko-fi Support Link</div>
                  <div class="text-xs text-muted-foreground">
                    Show a Ko-fi button so visitors can support you.
                  </div>
                </div>
                <Switch
                  bind:checked={kofiEnabled}
                  ariaLabel="Toggle Ko-fi link"
                />
                <input type="hidden" name="kofiEnabled" value={kofiEnabled ? 'true' : 'false'} />
              </div>
              {#if kofiEnabled}
                <input
                  name="kofiUrl"
                  type="url"
                  value={(source?.kofiUrl as string) ?? ''}
                  placeholder="https://ko-fi.com/yourname"
                  class="mt-3 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              {/if}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div class="flex justify-end gap-3">
        <a
          href={`/sites/${data.slug}`}
          class="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
        >
          Cancel
        </a>
        <button
          type="submit"
          class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-hover"
        >
          Save
        </button>
      </div>
    </form>
  {/if}
</div>