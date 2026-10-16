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
