import { describe, expect, it } from 'vitest';
import { allDiscussionsActive } from '$lib/nav';

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
