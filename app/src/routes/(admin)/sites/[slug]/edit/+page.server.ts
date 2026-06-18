import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Site metadata editor (parity with the legacy webs admin `/sites/[slug]/edit`).
// Edits the site's own fields via the webs `GET/PUT /sites/:slug` contract. `slug`
// is the immutable key; `plan` is tenant-level (not a site column) so it's not edited here.
//
// The webs backend stores settings as a mix of top-level columns (name, status,
// theme, colors, logo_url, default_language, dark_mode_enabled, ...) and a
// `config` JSONB column for boolean toggles and nested objects (kofi, socialLinks,
// articlesPageVisible, scrollToTopEnabled, contactEmail{,Enabled}). This module
// extracts all of those safely with typeof checks and fallbacks (same pattern
// as `sites/[slug]/+page.server.ts` and the legacy webs admin).
const STATUSES = ['active', 'inactive', 'draft', 'suspended'] as const;
const THEMES = ['default', 'minimal', 'modern', 'classic', 'bold'] as const;
const LANGUAGES = [
  'en',
  'es',
  'fr',
  'de',
  'it',
  'pt',
  'nl',
  'pl',
  'ru',
  'uk',
  'zh',
  'ja',
  'ko',
  'ar',
  'hi',
  'tr',
  'sv',
  'da',
  'fi',
  'no',
  'cs',
] as const;
const SOCIAL_PLATFORMS = [
  'Instagram',
  'Telegram',
  'YouTube',
  'X',
  'GitHub',
  'LinkedIn',
  'Facebook',
  'TikTok',
  'Website',
  'Email',
] as const;

interface SocialLink {
  platform: string;
  url: string;
}

interface SiteSettings {
  // General
  name: string;
  slug: string;
  description: string;
  status: string;
  defaultLanguage: string;
  // Profile (stored under site.config)
  avatarUrl: string;
  displayName: string;
  bio: string;
  // Theme
  theme: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  darkModeEnabled: boolean;
  logoUrl: string;
  // Social
  socialLinks: SocialLink[];
  // Features (stored under site.config)
  articlesPageVisible: boolean;
  scrollToTopEnabled: boolean;
  contactEmailEnabled: boolean;
  contactEmail: string;
  kofiEnabled: boolean;
  kofiUrl: string;
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function bool(value: unknown): boolean {
  return value === true || value === 'true' || value === 'on' || value === '1';
}

function readSocialLinks(value: unknown): SocialLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => v !== null && typeof v === 'object')
    .map((v) => ({
      platform: typeof v.platform === 'string' ? v.platform : 'Website',
      url: typeof v.url === 'string' ? v.url : '',
    }))
    .filter((v) => v.url !== '');
}

export const load: PageServerLoad = async ({ params, fetch }) => {
  const { slug } = params;
  let site: SiteSettings | null = null;
  let error: string | undefined;

  try {
    const res = await fetch(`/api/${slug}/sites/${slug}`);
    if (res.ok) {
      const body = await res.json();
      const s = (body && typeof body === 'object' && body.site ? body.site : body) as Record<
        string,
        unknown
      >;
      const config =
        s && typeof s.config === 'object' && s.config !== null && !Array.isArray(s.config)
          ? (s.config as Record<string, unknown>)
          : {};
      const kofi =
        config.kofi && typeof config.kofi === 'object' && !Array.isArray(config.kofi)
          ? (config.kofi as Record<string, unknown>)
          : {};

      site = {
        // General
        name: str(s.name),
        slug: str(s.slug, slug),
        description: str(s.description),
        status: str(s.status, 'active'),
        defaultLanguage: str(s.default_language ?? config.defaultLanguage, 'en'),
        // Profile (config-first, top-level fallback)
        avatarUrl: str(config.avatarUrl ?? s.avatar_url),
        displayName: str(config.displayName ?? s.display_name),
        bio: str(config.bio ?? s.bio),
        // Theme
        theme: str(s.theme, 'default'),
        primaryColor: str(s.primary_color, '#000000'),
        secondaryColor: str(s.secondary_color, '#ffffff'),
        accentColor: str(s.accent_color, '#3b82f6'),
        backgroundColor: str(s.background_color, '#ffffff'),
        darkModeEnabled: bool(s.dark_mode_enabled ?? config.darkModeEnabled),
        logoUrl: str(s.logo_url ?? config.logoUrl),
        // Social
        socialLinks: readSocialLinks(config.socialLinks ?? s.social_links),
        // Features
        articlesPageVisible: bool(config.articlesPageVisible),
        scrollToTopEnabled: bool(config.scrollToTopEnabled),
        contactEmailEnabled: bool(config.contactEmailEnabled),
        contactEmail: str(config.contactEmail),
        kofiEnabled: bool(kofi.enabled ?? config.kofiEnabled),
        kofiUrl: str(kofi.url ?? config.kofiUrl),
      };
    } else {
      error = `Site backend returned ${res.status}`;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load the site';
  }

  return {
    slug,
    site,
    error,
    statuses: STATUSES,
    themes: THEMES,
    languages: LANGUAGES,
    socialPlatforms: SOCIAL_PLATFORMS,
  };
};

export const actions: Actions = {
  default: async ({ request, params, fetch }) => {
    const { slug } = params;
    const form = await request.formData();

    // Collect a snapshot of submitted values for `form.values` echo on error.
    const values: Record<string, FormDataEntryValue | SocialLink[]> = {};
    for (const [key, val] of form.entries()) values[key] = val;

    // Parse socialLinks — accept either a hidden JSON input or repeated
    // platform/url pairs (socialPlatform[] / socialUrl[]).
    let socialLinks: SocialLink[] = [];
    const socialJson = form.get('socialLinks');
    if (typeof socialJson === 'string' && socialJson.trim() !== '') {
      try {
        const parsed = JSON.parse(socialJson);
        socialLinks = readSocialLinks(parsed);
      } catch {
        // Fall through to repeated-field parsing.
      }
    }
    if (socialLinks.length === 0) {
      const platforms = form.getAll('socialPlatform[]').map((v) => String(v));
      const urls = form.getAll('socialUrl[]').map((v) => String(v));
      socialLinks = platforms
        .map((platform, i) => ({ platform, url: urls[i] ?? '' }))
        .filter((l) => l.url !== '');
    }
    values.socialLinks = socialLinks;

    // Top-level scalar fields.
    const name = String(form.get('name') ?? '').trim();
    const description = String(form.get('description') ?? '');
    const status = String(form.get('status') ?? 'active');
    const theme = String(form.get('theme') ?? 'default');
    const defaultLanguage = String(form.get('defaultLanguage') ?? 'en');
    const primaryColor = String(form.get('primaryColor') ?? '#000000');
    const secondaryColor = String(form.get('secondaryColor') ?? '#ffffff');
    const accentColor = String(form.get('accentColor') ?? '#3b82f6');
    const backgroundColor = String(form.get('backgroundColor') ?? '#ffffff');
    const darkModeEnabled = bool(form.get('darkModeEnabled'));
    const logoUrl = String(form.get('logoUrl') ?? '');

    // Config-side fields (profile, features, socialLinks).
    const avatarUrl = String(form.get('avatarUrl') ?? '');
    const displayName = String(form.get('displayName') ?? '');
    const bio = String(form.get('bio') ?? '');
    const articlesPageVisible = bool(form.get('articlesPageVisible'));
    const scrollToTopEnabled = bool(form.get('scrollToTopEnabled'));
    const contactEmailEnabled = bool(form.get('contactEmailEnabled'));
    const contactEmail = String(form.get('contactEmail') ?? '');
    const kofiEnabled = bool(form.get('kofiEnabled'));
    const kofiUrl = String(form.get('kofiUrl') ?? '');

    if (!name) return fail(400, { error: 'Name is required.', values });
    if (!(STATUSES as readonly string[]).includes(status)) {
      return fail(400, { error: `Invalid status: ${status}`, values });
    }
    if (!(LANGUAGES as readonly string[]).includes(defaultLanguage)) {
      return fail(400, { error: `Invalid language: ${defaultLanguage}`, values });
    }

    const config: Record<string, unknown> = {
      avatarUrl,
      displayName,
      bio,
      articlesPageVisible,
      scrollToTopEnabled,
      contactEmailEnabled,
      contactEmail,
      kofi: { enabled: kofiEnabled, url: kofiUrl },
      socialLinks,
    };

    const updatePayload: Record<string, unknown> = {
      name,
      description,
      status,
      theme,
      default_language: defaultLanguage,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: accentColor,
      background_color: backgroundColor,
      dark_mode_enabled: darkModeEnabled,
      logo_url: logoUrl,
      config,
    };

    const res = await fetch(`/api/${slug}/sites/${slug}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(updatePayload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return fail(res.status, { error: body.error ?? `Save failed (${res.status})`, values });
    }

    // Stay on the page so the user can edit other tabs (no redirect).
    return { success: true, values };
  },
};
