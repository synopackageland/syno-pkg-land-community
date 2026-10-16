import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { GitHub } from '../lib/github';

const repository = 'synopackageland/community';
const api = new GitHub(process.env.GITHUB_TOKEN || '', repository);
const directory = process.env.OUT_DIR || '.data-out';
const refPath = `repos/${repository}/git/refs/heads/data`;
// Read refs through GraphQL: a missing first data branch is null, not a swallowed auth error.
const ref = (await api.gql<{ repository: { ref: { target: { oid: string } } | null } }>(
  '{repository(owner:"synopackageland",name:"community"){ref(qualifiedName:"refs/heads/data"){target{oid}}}}')).repository.ref;
async function files(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map((e) => e.isDirectory() ? files(join(path, e.name)) : [join(path, e.name)]))).flat();
}
const tree = await Promise.all((await files(directory)).map(async (path) => ({
  path: relative(directory, path).replaceAll('\\', '/'), mode: '100644', type: 'blob', content: await readFile(path, 'utf8')
})));
const created = await api.request<{ sha: string }>(`repos/${repository}/git/trees`, 'POST', { tree });
if (ref) {
  const previous = await api.request<{ tree: { sha: string } }>(`repos/${repository}/git/commits/${ref.target.oid}`);
  if (previous.tree.sha === created.sha) { console.log('Snapshot unchanged'); process.exit(0); }
}
const commit = await api.request<{ sha: string }>(`repos/${repository}/git/commits`, 'POST', {
  message: 'chore: refresh community snapshot\n\nCo-Authored-By: Claude <noreply@anthropic.com>', tree: created.sha,
  parents: ref ? [ref.target.oid] : [], author: { name: 'synopackageland', email: 'synopackageland@gmail.com' }
});
if (ref) await api.request(refPath, 'PATCH', { sha: commit.sha, force: false });
else await api.request(`repos/${repository}/git/refs`, 'POST', { ref: 'refs/heads/data', sha: commit.sha });
console.log(`Published snapshot ${commit.sha}`);
