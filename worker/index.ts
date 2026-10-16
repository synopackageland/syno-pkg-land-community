interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}
function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/package/')) {
      let id: string;
      try { id = decodeURIComponent(url.pathname.slice('/package/'.length)); }
      catch { return json({ error: 'invalid_package' }, 400); }
      if (!/^[A-Za-z0-9_.-]{1,160}$/.test(id)) return json({ error: 'invalid_package' }, 400);
      try {
        const raw = 'https://raw.githubusercontent.com/synopackageland/community/data/';
        const [status, meta] = await Promise.all([fetch(raw + 'catalog-sync.json'), fetch(raw + 'meta.json')]);
        if (status.ok && meta.ok) {
          const catalog = await status.json() as { packages: { key: string; category: string; official: boolean }[] };
          const categories = await meta.json() as { categories: { slug: string }[] };
          const pkg = catalog.packages.find((p) => p.key === `synopackageland/${id}`) ?? catalog.packages.find((p) => p.key.endsWith(`/${id}`));
          const slug = pkg?.official ? pkg.category : 'third-party';
          if (pkg && categories.categories.some((c) => c.slug === slug)) return Response.redirect(new URL(`/t/${encodeURIComponent(slug)}`, url).href, 302);
        }
      } catch { /* The GitHub entry point remains available if the snapshot is not ready. */ }
      const target = new URL('https://github.com/synopackageland/community/discussions');
      target.searchParams.set('discussions_q', id);
      return Response.redirect(target.href, 302);
    }
    if (url.pathname === '/api/auth/config' && request.method === 'GET') {
      return json({ clientId: env.GITHUB_CLIENT_SECRET ? env.GITHUB_CLIENT_ID ?? '' : '' });
    }
    if (url.pathname === '/api/health') return json({ service: 'synopkgland-community', repository: 'synopackageland/community' });
    if (url.pathname === '/api/oauth/token') {
      if (request.headers.get('Origin') !== url.origin) return json({ error: 'forbidden_origin' }, 403);
      if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
      if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return json({ error: 'sign_in_unavailable' }, 503);
      let code: unknown;
      try { ({ code } = await request.json() as { code?: unknown }); }
      catch { return json({ error: 'invalid_request' }, 400); }
      if (typeof code !== 'string' || !code || code.length > 1024) return json({ error: 'invalid_code' }, 400);
      try {
        const response = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code })
        });
        if (!response.ok) return json({ error: 'sign_in_failed' }, 502);
        const data = await response.json() as { access_token?: string };
        return data.access_token ? json({ access_token: data.access_token }) : json({ error: 'sign_in_failed' }, 400);
      } catch { return json({ error: 'sign_in_failed' }, 502); }
    }
    if (url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);
    return env.ASSETS.fetch(request);
  }
};
