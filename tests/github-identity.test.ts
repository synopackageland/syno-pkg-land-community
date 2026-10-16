// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { GitHub } from '../.github/lib/github';
afterEach(() => vi.unstubAllGlobals());
it('refuses catalog writes from a different identity', async () => {
  const request = vi.fn(async () => Response.json({ login: 'vtxyer' }));
  vi.stubGlobal('fetch', request);
  await expect(new GitHub('test', 'synopackageland/syno-pkg-land-community').mutate('mutation {}', {})).rejects.toThrow(/synopackageland/);
  expect(request).toHaveBeenCalledTimes(1);
});
it('checks the owner immediately before a catalog mutation', async () => {
  const request = vi.fn().mockResolvedValueOnce(Response.json({ login: 'synopackageland' }))
    .mockResolvedValueOnce(Response.json({ data: { ok: true } }));
  vi.stubGlobal('fetch', request);
  expect(await new GitHub('test', 'synopackageland/syno-pkg-land-community').mutate('mutation {}', {})).toEqual({ ok: true });
  expect(request.mock.calls[0][0]).toBe('https://api.github.com/user');
  expect(request.mock.calls[1][0]).toBe('https://api.github.com/graphql');
});
it('rejects an unexpected destination repository', () => {
  expect(() => new GitHub('test', 'vtxyer/community')).toThrow(/Unexpected/);
});
