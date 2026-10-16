import { readFile, mkdir, writeFile, appendFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { normalizeCatalog, planSync, runSync, type Settings, type ExistingPost, type Category } from '../lib/catalog-sync';
import { collectPages } from '../lib/pagination';
import { GitHub } from '../lib/github';

const settings = JSON.parse(await readFile('forum/catalog-settings.json', 'utf8')) as Settings & { catalogRepository: string; catalogBranch: string };
const token = process.env.CATALOG_SYNC_TOKEN || process.env.GITHUB_TOKEN || '';
const api = new GitHub(token, 'synopackageland/community');
const canWrite = Boolean(process.env.CATALOG_SYNC_TOKEN);
if (canWrite) await api.assertOwner();
const response = await fetch(`https://raw.githubusercontent.com/${settings.catalogRepository}/${settings.catalogBranch}/catalog.yaml`);
if (!response.ok) throw new Error(`Catalog fetch failed (${response.status}); no writes performed`);
const packages = normalizeCatalog(parse(await response.text()), settings);
const repository = (await api.gql<{ repository: { id: string; discussionCategories: { nodes: Category[] } } }>(
  '{repository(owner:"synopackageland",name:"community"){id discussionCategories(first:25){nodes{id slug}}}}')).repository;
const existing = await collectPages<ExistingPost>(async (cursor) => {
  const result = await api.gql<{ repository: { discussions: { nodes: ExistingPost[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } }>(
    'query($cursor:String){repository(owner:"synopackageland",name:"community"){discussions(first:100,after:$cursor){nodes{id title body} pageInfo{hasNextPage endCursor}}}}', { cursor });
  return result.repository.discussions;
});
const plan: ReturnType<typeof planSync> = { pendingCategories: [], posts: [] };
if (!repository.discussionCategories.nodes.some((c) => c.slug === settings.thirdParty)) {
  plan.pendingCategories.push({ key: 'shared', name: 'Third-party', slug: settings.thirdParty });
}
for (const pkg of packages) {
  try {
    const part = planSync([pkg], repository.discussionCategories.nodes, existing, settings);
    for (const pending of part.pendingCategories) if (!plan.pendingCategories.some((c) => c.slug === pending.slug)) plan.pendingCategories.push(pending);
    plan.posts.push(...part.posts);
  } catch (error) {
    // Missing one shared destination must not prevent updates for unrelated packages.
    if (!(error instanceof Error) || !error.message.startsWith('Missing destination category:')) throw error;
    const slug = pkg.official ? settings.announcements : settings.thirdParty;
    if (!plan.pendingCategories.some((c) => c.slug === slug)) plan.pendingCategories.push({ key: 'shared', name: slug, slug });
  }
}
if (canWrite) await runSync(plan, {
  create: (post) => api.mutate('mutation($input:CreateDiscussionInput!){createDiscussion(input:$input){discussion{id}}}',
    { input: { repositoryId: repository.id, categoryId: post.categoryId, title: post.title, body: post.body } }),
  update: (post) => api.mutate('mutation($input:UpdateDiscussionInput!){updateDiscussion(input:$input){discussion{id}}}',
    { input: { discussionId: post.id, title: post.title, body: post.body } })
});
const out = process.env.OUT_DIR || '.data-out';
await mkdir(out, { recursive: true });
const status = { syncedAt: new Date().toISOString(), catalogRepository: settings.catalogRepository,
  mode: canWrite ? 'write' : 'needs-catalog-sync-token', pendingCategories: plan.pendingCategories,
  pendingAnnouncements: canWrite ? 0 : plan.posts.length, packages,
  multiRepoReviewNeeded: new Set(packages.filter((p) => p.official).map((p) => p.key)).size >= 15 };
await writeFile(`${out}/catalog-sync.json`, JSON.stringify(status, null, 2));
console.log(JSON.stringify({ mode: status.mode, packages: packages.length, announcements: plan.posts.length,
  pendingCategories: plan.pendingCategories.map((c) => c.slug) }));
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,
  `## Catalog sync\nMode: ${status.mode}\n\n` + plan.pendingCategories.map((c) => `- Create category **${c.name}** (slug: \`${c.slug}\`) in [GitHub categories](https://github.com/synopackageland/community/discussions/categories).\n`).join('') +
  '\nCategory creation has no public GitHub API. Removed packages are never deleted.\n');
