import { describe, expect, it } from 'vitest';
import { allDiscussionsActive, sidebarGroups, topicVisual } from '$lib/nav';

describe('allDiscussionsActive', () => {
	it('is active on the home page only', () => {
		expect(allDiscussionsActive('/', '/')).toBe(true);
		for (const path of ['/new', '/search', '/t/reclaim', '/d/5', '/u/someone']) {
			expect(allDiscussionsActive(path, '/'), path).toBe(false);
		}
	});

	it('respects a base path', () => {
		expect(allDiscussionsActive('/forum', '/forum/')).toBe(true);
		expect(allDiscussionsActive('/forum/', '/forum')).toBe(true);
		expect(allDiscussionsActive('/forum/new', '/forum/')).toBe(false);
	});
});

describe('sidebarGroups', () => {
	const cats = ['announcements', 'connect', 'download-hub', 'general', 'reclaim', 'third-party', 'misc'].map((slug) => ({ slug }));
	const groups = sidebarGroups(cats);

	it('orders Discussions, Packages, News', () => {
		expect(groups.map((g) => g.label)).toEqual(['Discussions', 'Packages', 'News']);
	});
	it('puts package topics in a fixed order and everything unknown under Discussions', () => {
		expect(groups[0].items.map((c) => c.slug)).toEqual(['general', 'misc']);
		expect(groups[1].items.map((c) => c.slug)).toEqual(['reclaim', 'connect', 'download-hub', 'third-party']);
		expect(groups[2].items.map((c) => c.slug)).toEqual(['announcements']);
	});
	it('drops empty groups except Discussions, which holds the all-topics link', () => {
		expect(sidebarGroups([{ slug: 'reclaim' }]).map((g) => g.label)).toEqual(['Discussions', 'Packages']);
		expect(sidebarGroups([]).map((g) => g.label)).toEqual(['Discussions']);
	});
});

describe('topicVisual', () => {
	it('gives each known topic its own icon and tint', () => {
		expect(topicVisual('announcements')).toEqual({ icon: 'megaphone', tint: 'text-fd-tag-amber' });
		expect(topicVisual('general')).toEqual({ icon: 'message', tint: 'text-fd-tag-slate' });
		expect(topicVisual('reclaim')).toEqual({ icon: 'drive', tint: 'text-fd-tag-teal' });
		expect(topicVisual('connect')).toEqual({ icon: 'link', tint: 'text-fd-tag-violet' });
		expect(topicVisual('download-hub')).toEqual({ icon: 'download', tint: 'text-fd-tag-sky' });
		expect(topicVisual('third-party')).toEqual({ icon: 'package', tint: 'text-fd-tag-rose' });
	});
	it('falls back to a neutral hash for unknown topics', () => {
		expect(topicVisual('whatever')).toEqual({ icon: 'hash', tint: 'text-fd-tag-slate' });
	});
});
