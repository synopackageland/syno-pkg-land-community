export interface Settings {
  owner: string;
  announcements: string;
  thirdParty: string;
  packages: Record<string, { name: string; category: string }>;
}
export interface PackageRelease { key: string; name: string; version: string; official: boolean; category: string; notes: string }
export interface Category { id: string; slug: string }
export interface ExistingPost { id: string; title: string; body: string }
export interface Post { kind: 'create' | 'update'; id?: string; categoryId: string; title: string; body: string }
export interface Plan { pendingCategories: { key: string; name: string; slug: string }[]; posts: Post[] }

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid catalog object');
  return value as Record<string, unknown>;
}
function required(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim() || /[\r\n<>]/.test(value)) throw new Error(`Invalid ${field}`);
  return value;
}

export function normalizeCatalog(input: unknown, settings: Settings): PackageRelease[] {
  const catalog = record(input);
  if (catalog.schema !== 3 || !Array.isArray(catalog.packages)) throw new Error('Expected catalog schema 3');
  const releases = new Map<string, PackageRelease>();
  for (const raw of catalog.packages) {
    const pkg = record(raw);
    const publisher = required(pkg.publisher, 'publisher');
    if (!Array.isArray(pkg.pins) || !pkg.pins.length) throw new Error('Expected package pins');
    const metadata = pkg.metadata ? record(pkg.metadata) : {};
    const changelog = metadata.changelog;
    const notes = typeof changelog === 'string' ? changelog : changelog && typeof changelog === 'object'
      ? Object.entries(changelog).filter(([language, text]) => ['zh-TW', 'en'].includes(language) && typeof text === 'string')
        .map(([language, text]) => `### ${language}\n\n${text}`).join('\n\n') : '';
    for (const rawPin of pkg.pins) {
      const pin = record(rawPin);
      const id = required(pin.package, 'package');
      const version = required(pin.version, 'version');
      const key = `${publisher}/${id}`;
      const configured = settings.packages[key];
      releases.set(`${key}\0${version}`, { key, version, name: configured?.name ?? id,
        official: publisher === settings.owner, category: configured?.category ?? id.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        notes });
    }
  }
  return [...releases.values()];
}

export function releaseMarker(key: string, version: string): string {
  return `<!-- synopkgland:release:${encodeURIComponent(key)}:${encodeURIComponent(version)} -->`;
}

export function planSync(packages: PackageRelease[], categories: Category[], existing: ExistingPost[], settings: Settings): Plan {
  const plan: Plan = { pendingCategories: [], posts: [] };
  const known = new Set<string>();
  for (const pkg of packages) {
    const destination = pkg.official ? settings.announcements : settings.thirdParty;
    const category = categories.find((c) => c.slug === destination);
    if (!category) throw new Error(`Missing destination category: ${destination}`);
    const board = pkg.official ? pkg.category : settings.thirdParty;
    if (!categories.some((c) => c.slug === board) && !known.has(board)) {
      plan.pendingCategories.push({ key: pkg.key, name: pkg.name, slug: board });
      known.add(board);
    }
    const marker = releaseMarker(pkg.key, pkg.version);
    const title = `${pkg.official ? '' : `[${pkg.key}] `}${pkg.name} ${pkg.version}`;
    const body = `${marker}\n\n${pkg.name} **${pkg.version}**\n\n${pkg.notes || 'A new package version is available. / 套件已有新版本。'}\n\n` +
      `Package: \`${pkg.key}\`\n\n[Browse packages / 瀏覽套件](https://synopkgland.com/apps/)\n\n` +
      (pkg.official ? '' : 'Shared by the catalog automation. Third-party packages are maintained by their authors. / 第三方套件由原作者維護。\n');
    const post = existing.find((d) => d.body.includes(marker));
    if (!post) plan.posts.push({ kind: 'create', categoryId: category.id, title, body });
    else if (post.title !== title || post.body !== body) plan.posts.push({ kind: 'update', id: post.id, categoryId: category.id, title, body });
  }
  return plan;
}

export async function runSync(plan: Plan, api: {
  create(post: Post): Promise<unknown>; update(post: Post): Promise<unknown>;
}): Promise<void> {
  for (const post of plan.posts) await (post.kind === 'create' ? api.create(post) : api.update(post));
}
