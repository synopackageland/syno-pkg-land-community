// @vitest-environment node
import { describe, expect, it, vi, afterEach } from 'vitest';
import worker from '../worker/index';
afterEach(() => vi.unstubAllGlobals());
const env = { ASSETS: { fetch: vi.fn(async () => new Response('<html>forum</html>')) } };
describe('forum Worker', () => {
  it('rejects malformed percent encoding in package links', async () => {
    const response = await worker.fetch(new Request('https://community.synopkgland.com/package/%FF'), env);
    expect(response.status).toBe(400);
  });
  it('routes a package to its native category when that category exists', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(url.endsWith('catalog-sync.json')
      ? { packages: [{ key: 'synopackageland/SynoReclaim', category: 'reclaim', official: true }] }
      : { categories: [{ slug: 'reclaim' }] })));
    const response = await worker.fetch(new Request('https://community.synopkgland.com/package/SynoReclaim'), env);
    expect(response.headers.get('Location')).toBe('https://community.synopkgland.com/t/reclaim');
  });
  it('keeps the package link usable while category setup is pending', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    const response = await worker.fetch(new Request('https://community.synopkgland.com/package/SynoReclaim'), env);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toContain('github.com/synopackageland/syno-pkg-land-community/discussions');
    expect(response.headers.get('Location')).toContain('SynoReclaim');
  });
  it('serves deep discussion links through static assets', async () => {
    const response = await worker.fetch(new Request('https://community.synopkgland.com/d/42'), env);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('forum');
  });
  it('exposes only the public OAuth client ID, never the secret', async () => {
    const response = await worker.fetch(new Request('https://community.synopkgland.com/api/auth/config'),
      { ...env, GITHUB_CLIENT_ID: 'client', GITHUB_CLIENT_SECRET: 'must-never-leak' });
    expect(await response.json()).toEqual({ clientId: 'client' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it('rejects cross-origin token exchanges', async () => {
    const response = await worker.fetch(new Request('https://community.synopkgland.com/api/oauth/token',
      { method: 'POST', headers: { Origin: 'https://attacker.test' }, body: '{}' }), env);
    expect(response.status).toBe(403);
  });
  it('fails closed until OAuth is configured', async () => {
    const response = await worker.fetch(new Request('https://community.synopkgland.com/api/oauth/token',
      { method: 'POST', headers: { Origin: 'https://community.synopkgland.com' }, body: '{}' }), env);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('SECRET');
  });
});

describe('SEO routes', () => {
  const snapshot = (url: string) => {
    if (url.endsWith('meta.json')) return Response.json({ categories: [{ slug: 'announcements', name: 'Announcements', description: 'Updates' }, { slug: 'polls', name: 'Polls', description: '' }] });
    if (url.endsWith('posts/index.json')) return Response.json({ discussions: [{ number: 5, title: 'Hub 0.2', body: 'Fixes things', createdAt: '2026-10-16T04:21:11Z', category: { slug: 'announcements' } }] });
    return new Response('', { status: 404 });
  };
  const shellEnv = { ASSETS: { fetch: vi.fn(async () => new Response('<html><head><title>x</title></head><body>app</body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } })) } };

  it('serves /sitemap.xml as XML built from the snapshot', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => snapshot(url)));
    const response = await worker.fetch(new Request('https://community.synopkgland.com/sitemap.xml'), env);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/xml; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toContain('max-age=');
    const xml = await response.text();
    expect(xml).toContain('<loc>https://community.synopkgland.com/d/5</loc>');
    expect(xml).toContain('<loc>https://community.synopkgland.com/t/announcements</loc>');
    expect(xml).not.toContain('/t/polls');
  });
  it('answers 503 for the sitemap while the snapshot is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    const response = await worker.fetch(new Request('https://community.synopkgland.com/sitemap.xml'), env);
    expect(response.status).toBe(503);
  });
  it('answers 503 for the sitemap when the snapshot request throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const response = await worker.fetch(new Request('https://community.synopkgland.com/sitemap.xml'), env);
    expect(response.status).toBe(503);
  });
  it('injects title, description and canonical into a discussion page', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => snapshot(url)));
    const response = await worker.fetch(new Request('https://community.synopkgland.com/d/5'), shellEnv);
    const html = await response.text();
    expect(response.headers.get('Content-Type')).toContain('text/html');
    expect(html).toContain('<title>Hub 0.2 — Syno Package Land Community</title>');
    expect(html).toContain('<meta name="description" content="Fixes things">');
    expect(html).toContain('<link rel="canonical" href="https://community.synopkgland.com/d/5">');
    expect(html).toContain('app');
  });
  it('injects head tags into a topic page', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => snapshot(url)));
    const html = await (await worker.fetch(new Request('https://community.synopkgland.com/t/announcements'), shellEnv)).text();
    expect(html).toContain('<title>Announcements — Syno Package Land Community</title>');
  });
  it('serves the plain app shell for unknown pages or when the snapshot is down', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => snapshot(url)));
    expect(await (await worker.fetch(new Request('https://community.synopkgland.com/d/999'), shellEnv)).text()).toContain('<title>x</title>');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const down = await worker.fetch(new Request('https://community.synopkgland.com/d/5'), shellEnv);
    expect(down.status).toBe(200);
    expect(await down.text()).toContain('<title>x</title>');
  });
  it('leaves non-HTML shells alone', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => snapshot(url)));
    const jsonEnv = { ASSETS: { fetch: vi.fn(async () => new Response('{}', { headers: { 'Content-Type': 'application/json' } })) } };
    expect(await (await worker.fetch(new Request('https://community.synopkgland.com/d/5'), jsonEnv)).text()).toBe('{}');
  });
});
