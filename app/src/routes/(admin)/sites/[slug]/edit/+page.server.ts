import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Canonical Site adapter contract: GET/PUT /site-settings. The slug is the
// immutable adapter key; tenant billing fields are intentionally out of scope.
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
    const res = await fetch(`/api/${slug}/site-settings`);
    if (res.ok) {
      const body = await res.json();
      const s = (
        body && typeof body === 'object' && body.settings ? body.settings : body
      ) as Record<string, unknown>;
      const metadata =
        s && typeof s.metadata === 'object' && s.metadata !== null && !Array.isArray(s.metadata)
          ? (s.metadata as Record<string, unknown>)
          : {};
      const kofi =
        metadata.kofi && typeof metadata.kofi === 'object' && !Array.isArray(metadata.kofi)
          ? (metadata.kofi as Record<string, unknown>)
          : {};

      site = {
        // General
        name: str(s.title ?? s.name),
        slug: str(s.slug, slug),
        description: str(s.description),
        status: str(metadata.status, 'active'),
        defaultLanguage: str(s.locale ?? metadata.defaultLanguage, 'en'),
        // Profile
        avatarUrl: str(metadata.avatarUrl),
        displayName: str(metadata.displayName),
        bio: str(metadata.bio),
        // Theme
        theme: str(metadata.theme, 'default'),
        primaryColor: str(metadata.primaryColor, '#000000'),
        secondaryColor: str(metadata.secondaryColor, '#ffffff'),
        accentColor: str(metadata.accentColor, '#3b82f6'),
        backgroundColor: str(metadata.backgroundColor, '#ffffff'),
        darkModeEnabled: bool(metadata.darkModeEnabled),
        logoUrl: str(s.logoUrl),
        // Social
        socialLinks: readSocialLinks(metadata.socialLinks),
        // Features
        articlesPageVisible: bool(metadata.articlesPageVisible),
        scrollToTopEnabled: bool(metadata.scrollToTopEnabled),
        contactEmailEnabled: bool(metadata.contactEmailEnabled),
        contactEmail: str(metadata.contactEmail),
        kofiEnabled: bool(kofi.enabled ?? metadata.kofiEnabled),
        kofiUrl: str(kofi.url ?? metadata.kofiUrl),
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
      slug,
      title: name,
      description,
      locale: defaultLanguage,
      logoUrl: logoUrl || null,
      metadata: {
        ...config,
        status,
        theme,
        primaryColor,
        secondaryColor,
        accentColor,
        backgroundColor,
        darkModeEnabled,
      },
    };

    const res = await fetch(`/api/${slug}/site-settings`, {
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
