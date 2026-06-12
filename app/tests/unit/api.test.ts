// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@hiai/ui');

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  for (const key of Object.keys(process.env)) {
    if (key === 'API_URL') delete process.env[key];
  }
  vi.resetModules();
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    process.env[key] = value;
  }
  vi.restoreAllMocks();
});

function makeCreateApiMock(captured: { baseUrl?: string }) {
  return {
    createApi: vi.fn((baseUrl: string) => {
      captured.baseUrl = baseUrl;
      return {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      };
    }),
  };
}

describe('api client — server (node) environment', () => {
  it('uses API_URL when provided', async () => {
    process.env.API_URL = 'https://api.example.com';
    const captured: { baseUrl?: string } = {};
    vi.doMock('@hiai/ui', () => makeCreateApiMock(captured));

    await import('../../src/lib/api');
    expect(captured.baseUrl).toBe('https://api.example.com');
  });

  it('falls back to the default local API URL when API_URL is unset', async () => {
    const captured: { baseUrl?: string } = {};
    vi.doMock('@hiai/ui', () => makeCreateApiMock(captured));

    await import('../../src/lib/api');
    expect(captured.baseUrl).toBe('http://localhost:50200');
  });

  it('does not set `window` to a non-undefined value during module load', async () => {
    const captured: { baseUrl?: string } = {};
    vi.doMock('@hiai/ui', () => makeCreateApiMock(captured));
    const originalWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = undefined;

    try {
      await import('../../src/lib/api');
      expect(captured.baseUrl).toBe(process.env.API_URL ?? 'http://localhost:50200');
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window?: unknown }).window = originalWindow;
      }
    }
  });
});

describe('api client — browser environment', () => {
  it('uses an empty string baseUrl when `window` is defined (relative URLs)', async () => {
    const captured: { baseUrl?: string } = {};
    vi.doMock('@hiai/ui', () => makeCreateApiMock(captured));
    const originalWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = { location: { href: 'https://app.example.com' } };

    try {
      await import('../../src/lib/api');
      expect(captured.baseUrl).toBe('');
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window?: unknown }).window = originalWindow;
      }
    }
  });
});
