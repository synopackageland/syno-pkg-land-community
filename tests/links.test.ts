import { describe, expect, it } from 'vitest';
import { discussionUrl, newPostUrl } from '$lib/github/links';
import { forumConfig } from '$lib/config';

const base = `https://github.com/${forumConfig.repo.owner}/${forumConfig.repo.name}/discussions`;

describe('GitHub writing links', () => {
	it('opens the category chooser when no topic is known', () => {
		expect(newPostUrl()).toBe(`${base}/new/choose`);
		expect(newPostUrl(null)).toBe(`${base}/new/choose`);
	});
	it('preselects the topic on GitHub', () => {
		expect(newPostUrl('download-hub')).toBe(`${base}/new?category=download-hub`);
		expect(newPostUrl('a b&c')).toBe(`${base}/new?category=a%20b%26c`);
	});
	it('links a discussion by number', () => {
		expect(discussionUrl(42)).toBe(`${base}/42`);
	});
});
