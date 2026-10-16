// Crawler-facing pages: the sitemap and per-page <head> tags. The forum is a
// client-side app, so the Worker adds what a crawler needs before any JS runs.
import { excerpt } from '../src/lib/utils';

export interface Snapshot {
	meta: { categories: { slug: string; name: string; description: string }[] };
	index: { discussions: { number: number; title: string; body?: string; createdAt: string; category: { slug: string } }[] };
}
export interface Head {
	title: string;
	tags: string;
}

const SITE_NAME = 'Syno Package Land Community';
const SITE_DESCRIPTION = 'Package support, ideas and releases / 套件討論、建議與更新';

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s: string) => escapeXml(s).replace(/"/g, '&quot;');

function visible(snapshot: Snapshot, exclude: string[]) {
	return {
		categories: snapshot.meta.categories.filter((c) => !exclude.includes(c.slug)),
		discussions: snapshot.index.discussions.filter((d) => !exclude.includes(d.category.slug))
	};
}

/** Latest of ISO timestamps (same format sorts lexically); undefined when none. */
const newest = (times: string[]) => times.reduce<string | undefined>((a, t) => (a === undefined || t > a ? t : a), undefined);

export function sitemapXml(origin: string, snapshot: Snapshot, exclude: string[]): string {
	const { categories, discussions } = visible(snapshot, exclude);
	const url = (path: string, lastmod?: string) =>
		`<url><loc>${origin}${path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
	const lines = [
		url('/', newest(discussions.map((d) => d.createdAt))),
		...categories.map((c) =>
			url(`/t/${encodeURIComponent(c.slug)}`, newest(discussions.filter((d) => d.category.slug === c.slug).map((d) => d.createdAt)))
		),
		...discussions.map((d) => url(`/d/${d.number}`, d.createdAt))
	];
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join('\n')}\n</urlset>\n`;
}

function headFor(origin: string, path: string, title: string, description: string, type: 'article' | 'website'): Head {
	const url = `${origin}${path}`;
	const tags = [
		`<link rel="canonical" href="${url}">`,
		`<meta name="description" content="${escapeAttr(description)}">`,
		`<meta property="og:type" content="${type}">`,
		`<meta property="og:title" content="${escapeAttr(title)}">`,
		`<meta property="og:description" content="${escapeAttr(description)}">`,
		`<meta property="og:url" content="${url}">`,
		`<meta property="og:site_name" content="${SITE_NAME}">`,
		`<meta property="og:image" content="${origin}/brand/icon-128.png">`,
		`<meta name="twitter:card" content="summary">`
	].join('\n');
	return { title: `${title} — ${SITE_NAME}`, tags };
}

function decode(s: string): string | null {
	try {
		return decodeURIComponent(s);
	} catch {
		return null;
	}
}

/** Head for a discussion or topic page in the snapshot; null for anything else. */
export function pageHead(origin: string, pathname: string, snapshot: Snapshot, exclude: string[]): Head | null {
	const { categories, discussions } = visible(snapshot, exclude);
	const path = pathname.replace(/\/+$/, '');
	const discussion = path.match(/^\/d\/(\d+)$/);
	if (discussion) {
		const d = discussions.find((x) => x.number === Number(discussion[1]));
		if (!d) return null;
		const text = excerpt((d.body ?? '').replace(/<[^>]*>/g, ' '), 160, d.title);
		return headFor(origin, path, d.title, text || SITE_DESCRIPTION, 'article');
	}
	const topic = path.match(/^\/t\/([^/]+)$/);
	if (topic) {
		const slug = decode(topic[1]);
		const c = categories.find((x) => x.slug === slug);
		if (!c) return null;
		return headFor(origin, `/t/${encodeURIComponent(c.slug)}`, c.name, c.description || SITE_DESCRIPTION, 'website');
	}
	return null;
}

export function injectHead(html: string, head: Head): string {
	const title = `<title>${escapeXml(head.title)}</title>`;
	if (!html.includes('</head>')) return html;
	const withTitle = /<title>[^<]*<\/title>/.test(html) ? html.replace(/<title>[^<]*<\/title>/, () => title) : html.replace('</head>', () => `${title}</head>`);
	return withTitle.replace('</head>', () => `${head.tags}</head>`);
}
