// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { homeHead, injectHead, pageHead, sitemapXml, type Snapshot } from '../worker/seo';

const origin = 'https://community.synopkgland.com';
const snapshot: Snapshot = {
	meta: {
		categories: [
			{ slug: 'announcements', name: 'Announcements', description: 'Updates from maintainers' },
			{ slug: 'general', name: 'General', description: '' },
			{ slug: 'polls', name: 'Polls', description: 'hidden' }
		]
	},
	index: {
		discussions: [
			{ number: 5, title: 'Download Hub 0.2.2-0037', body: '<!-- x -->\n\n### en\n\nRemoving the **entry** & more <b>', createdAt: '2026-10-16T04:21:11Z', category: { slug: 'announcements' } },
			{ number: 2, title: 'Older "post"', body: '', createdAt: '2026-10-10T00:00:00Z', updatedAt: '2026-10-18T09:00:00Z', category: { slug: 'announcements' } },
			{ number: 9, title: 'In hidden topic', body: 'x', createdAt: '2026-10-17T00:00:00Z', category: { slug: 'polls' } }
		]
	}
};
const exclude = ['polls'];

describe('sitemapXml', () => {
	const xml = sitemapXml(origin, snapshot, exclude);
	it('is a urlset with the home page, visible topics and discussions', () => {
		expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
		const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
		expect(locs).toEqual([
			`${origin}/`,
			`${origin}/t/announcements`,
			`${origin}/t/general`,
			`${origin}/d/5`,
			`${origin}/d/2`
		]);
	});
	it('prefers updatedAt for lastmod and falls back to createdAt', () => {
		expect(xml).toContain(`<loc>${origin}/d/2</loc><lastmod>2026-10-18T09:00:00Z</lastmod>`);
		expect(xml).toContain(`<loc>${origin}/d/5</loc><lastmod>2026-10-16T04:21:11Z</lastmod>`);
	});
	it('uses the newest activity of a topic and of the forum for their lastmod', () => {
		expect(xml).toContain(`<loc>${origin}/t/announcements</loc><lastmod>2026-10-18T09:00:00Z</lastmod>`);
		expect(xml).toContain(`<loc>${origin}/</loc><lastmod>2026-10-18T09:00:00Z</lastmod>`);
	});
	it('omits lastmod for a topic without discussions', () => {
		expect(xml).toContain(`<loc>${origin}/t/general</loc></url>`);
	});
	it('percent-encodes slugs', () => {
		const out = sitemapXml(origin, { ...snapshot, meta: { categories: [{ slug: 'a&b c', name: 'x', description: '' }] }, index: { discussions: [] } }, []);
		expect(out).toContain(`${origin}/t/a%26b%20c`);
		expect(out).not.toContain('<lastmod>');
	});
	it('lists only the home page when the snapshot is empty', () => {
		const out = sitemapXml(origin, { meta: { categories: [] }, index: { discussions: [] } }, []);
		expect(out.match(/<url>/g)).toHaveLength(1);
	});
});

describe('pageHead', () => {
	it('describes a discussion with title, description, canonical and Open Graph', () => {
		const head = pageHead(origin, '/d/5', snapshot, exclude)!;
		expect(head.title).toBe('Download Hub 0.2.2-0037 — Syno Package Land Community');
		expect(head.tags).toContain('<link rel="canonical" href="https://community.synopkgland.com/d/5">');
		expect(head.tags).toContain('<meta name="description" content="Removing the entry &amp; more">');
		expect(head.tags).toContain('<meta property="og:type" content="article">');
		expect(head.tags).toContain('<meta property="og:title" content="Download Hub 0.2.2-0037">');
		expect(head.tags).toContain('<meta property="og:url" content="https://community.synopkgland.com/d/5">');
		expect(head.tags).toContain('<meta property="og:site_name" content="Syno Package Land Community">');
		expect(head.tags).toContain('<meta property="og:image" content="https://community.synopkgland.com/brand/icon-128.png">');
		expect(head.tags).toContain('<meta name="twitter:card" content="summary">');
	});
	it('escapes quotes and angle brackets from titles', () => {
		const head = pageHead(origin, '/d/2', snapshot, exclude)!;
		expect(head.title).toBe('Older "post" — Syno Package Land Community');
		expect(head.tags).toContain('content="Older &quot;post&quot;"');
		expect(head.tags).toContain('<meta name="description" content="Package support, ideas and releases">');
	});
	it('describes a topic with its own description, or the site description', () => {
		const a = pageHead(origin, '/t/announcements', snapshot, exclude)!;
		expect(a.title).toBe('Announcements — Syno Package Land Community');
		expect(a.tags).toContain('<meta name="description" content="Updates from maintainers">');
		expect(a.tags).toContain('<link rel="canonical" href="https://community.synopkgland.com/t/announcements">');
		expect(a.tags).toContain('<meta property="og:type" content="website">');
		const g = pageHead(origin, '/t/general', snapshot, exclude)!;
		expect(g.tags).toContain('Package support, ideas and releases');
	});
	it('ignores trailing slashes and decodes topic slugs', () => {
		expect(pageHead(origin, '/t/announcements/', snapshot, exclude)).not.toBeNull();
		expect(pageHead(origin, '/t/%E3%81%82', snapshot, exclude)).toBeNull();
	});
	it('returns null for unknown, hidden or unrelated pages', () => {
		expect(pageHead(origin, '/d/404', snapshot, exclude)).toBeNull();
		expect(pageHead(origin, '/d/9', snapshot, exclude)).toBeNull();
		expect(pageHead(origin, '/d/abc', snapshot, exclude)).toBeNull();
		expect(pageHead(origin, '/t/polls', snapshot, exclude)).toBeNull();
		expect(pageHead(origin, '/t/missing', snapshot, exclude)).toBeNull();
		expect(pageHead(origin, '/t/%FF', snapshot, exclude)).toBeNull();
		expect(pageHead(origin, '/new', snapshot, exclude)).toBeNull();
		expect(pageHead(origin, '/d/5/extra', snapshot, exclude)).toBeNull();
	});
});

describe('homeHead', () => {
	it('describes the forum with canonical and Open Graph, needing no snapshot', () => {
		const head = homeHead(origin);
		expect(head.title).toBe('Syno Package Land Community — Home');
		expect(head.tags).toContain('<link rel="canonical" href="https://community.synopkgland.com/">');
		expect(head.tags).toContain('<meta name="description" content="Package support, ideas and releases">');
		expect(head.tags).toContain('<meta property="og:type" content="website">');
		expect(head.tags).toContain('<meta property="og:title" content="Syno Package Land Community">');
		expect(head.tags).toContain('<meta property="og:url" content="https://community.synopkgland.com/">');
	});
});

describe('injectHead', () => {
	const shell = '<html><head><meta charset="utf-8"><title>old</title></head><body></body></html>';
	it('replaces the title and adds tags at the end of <head>', () => {
		const out = injectHead(shell, { title: 'A & B', tags: '<meta name="x" content="y">' });
		expect(out).toContain('<title>A &amp; B</title>');
		expect(out).not.toContain('old');
		expect(out).toContain('<meta name="x" content="y"></head>');
	});
	it('adds a title when the shell has none', () => {
		const out = injectHead('<head></head>', { title: 'T', tags: '' });
		expect(out).toBe('<head><title>T</title></head>');
	});
	it('leaves a document without <head> unchanged', () => {
		expect(injectHead('plain', { title: 'T', tags: '' })).toBe('plain');
	});
});

describe('robots.txt', () => {
	const robots = readFileSync(path.resolve(__dirname, '../static/robots.txt'), 'utf8');
	it('allows crawling, links the sitemap and hides non-content paths', () => {
		expect(robots).toContain('User-agent: *');
		expect(robots).toContain('Sitemap: https://community.synopkgland.com/sitemap.xml');
		for (const p of ['/api/', '/auth/', '/new', '/search']) expect(robots).toContain(`Disallow: ${p}`);
		expect(robots).not.toMatch(/^Disallow:\s*\/\s*$/m);
	});
});
