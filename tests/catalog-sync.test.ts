// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { normalizeCatalog, planSync, releaseMarker, runSync } from '../.github/lib/catalog-sync';

const settings = { owner: 'synopackageland', announcements: 'announcements', thirdParty: 'third-party',
  packages: { 'synopackageland/SynoReclaim': { name: 'Reclaim', category: 'reclaim' } } };
const categories = [{ id: 'ann', slug: 'announcements' }, { id: 'third', slug: 'third-party' }, { id: 'r', slug: 'reclaim' }];
function catalog(version = '1.0', extra = false) {
  return { schema: 3, packages: [{ publisher: 'synopackageland', source: { repo: 'synopackageland/reclaim' },
    metadata: { changelog: { 'zh-TW': '修正問題' } }, pins: [
      { package: 'SynoReclaim', version, arch: ['x64'] }, { package: 'SynoReclaim', version, arch: ['arm64'] }
    ] }, ...(extra ? [{ publisher: 'alice', source: { repo: 'alice/tool' }, pins: [{ package: 'Tool', version: '2.0' }] }] : [])] };
}

describe('catalog synchronization', () => {
  it('deduplicates architecture pins and plans one initial announcement', () => {
    const packages = normalizeCatalog(catalog(), settings);
    expect(packages).toHaveLength(1);
    const plan = planSync(packages, categories, [], settings);
    expect(plan.pendingCategories).toEqual([]);
    expect(plan.posts).toHaveLength(1);
    expect(plan.posts[0]).toMatchObject({ kind: 'create', categoryId: 'ann', title: 'Reclaim 1.0' });
    expect(plan.posts[0].body).toContain('修正問題');
  });

  it('announces a new version while retaining previous versions', () => {
    const old = { id: 'old', title: 'Reclaim 1.0', body: releaseMarker('synopackageland/SynoReclaim', '1.0') };
    const plan = planSync(normalizeCatalog(catalog('1.1'), settings), categories, [old], settings);
    expect(plan.posts).toHaveLength(1);
    expect(plan.posts[0]).toMatchObject({ kind: 'create', title: 'Reclaim 1.1' });
    expect(plan).not.toHaveProperty('deletions');
  });

  it('never deletes boards or announcements when a package is removed', () => {
    const existing = [{ id: 'old', title: 'old', body: releaseMarker('synopackageland/Removed', '1') }];
    expect(planSync([], categories, existing, settings)).toEqual({ pendingCategories: [], posts: [] });
  });

  it('reruns idempotently, including a retry after a successful write', async () => {
    const existing: { id: string; title: string; body: string }[] = [];
    const writes: unknown[] = [];
    const api = {
      async create(input: { title: string; body: string }) { writes.push(input); existing.push({ id: 'one', ...input }); },
      async update() { throw new Error('unchanged posts must not be rewritten'); }
    };
    for (let i = 0; i < 2; i++) {
      const plan = planSync(normalizeCatalog(catalog(), settings), categories, existing, settings);
      await runSync(plan, api);
    }
    expect(writes).toHaveLength(1);
  });

  it('updates the same version in place when its generated release notes change', () => {
    const existing = [{ id: 'old', title: 'old', body: releaseMarker('synopackageland/SynoReclaim', '1.0') }];
    const plan = planSync(normalizeCatalog(catalog(), settings), categories, existing, settings);
    expect(plan.posts[0]).toMatchObject({ kind: 'update', id: 'old' });
  });

  it('reports a missing native category without pretending to create it', () => {
    const plan = planSync(normalizeCatalog(catalog(), settings), categories.slice(0, 2), [], settings);
    expect(plan.pendingCategories).toEqual([{ key: 'synopackageland/SynoReclaim', name: 'Reclaim', slug: 'reclaim' }]);
    expect(plan.posts).toHaveLength(1);
  });

  it('uses the shared third-party category and stable author/package prefix', () => {
    const plan = planSync(normalizeCatalog(catalog('1', true), settings), categories, [], settings);
    expect(plan.posts[1]).toMatchObject({ categoryId: 'third', title: '[alice/Tool] Tool 2.0' });
    expect(plan.pendingCategories).toEqual([]);
  });

  it('fails closed on malformed data or missing destinations', () => {
    expect(() => normalizeCatalog({ packages: [] }, settings)).toThrow(/schema/);
    expect(() => normalizeCatalog({ schema: 3, packages: [{ publisher: 'x', pins: [] }] }, settings)).toThrow(/pins/);
    expect(() => planSync(normalizeCatalog(catalog(), settings), [], [], settings)).toThrow(/announcements/);
  });

  it('does not leak a private source URL or an untrusted homepage into announcements', () => {
    const input = catalog();
    Object.assign(input.packages[0].metadata!, { homepage: 'javascript:alert(1)' });
    const plan = planSync(normalizeCatalog(input, settings), categories, [], settings);
    expect(plan.posts[0].body).not.toContain('javascript:');
    expect(plan.posts[0].body).not.toContain('github.com/synopackageland/reclaim');
  });
});
