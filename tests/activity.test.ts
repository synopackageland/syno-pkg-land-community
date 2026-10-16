import { describe, expect, it } from 'vitest';
import { lastActivityAt } from '$lib/archive/activity';

const d = (over: object = {}) => ({
	createdAt: '2026-10-01T00:00:00Z',
	lastEditedAt: null as string | null,
	comments: { nodes: [] as { createdAt: string; replies: { nodes: { createdAt: string }[] } }[] },
	...over
});

describe('lastActivityAt', () => {
	it('is the creation time for an untouched discussion', () => {
		expect(lastActivityAt(d())).toBe('2026-10-01T00:00:00Z');
	});
	it('takes a later edit', () => {
		expect(lastActivityAt(d({ lastEditedAt: '2026-10-03T00:00:00Z' }))).toBe('2026-10-03T00:00:00Z');
	});
	it('takes the newest comment or reply', () => {
		const comments = {
			nodes: [
				{ createdAt: '2026-10-02T00:00:00Z', replies: { nodes: [{ createdAt: '2026-10-05T00:00:00Z' }] } },
				{ createdAt: '2026-10-04T00:00:00Z', replies: { nodes: [] } }
			]
		};
		expect(lastActivityAt(d({ comments }))).toBe('2026-10-05T00:00:00Z');
	});
	it('ignores activity older than the post itself', () => {
		expect(lastActivityAt(d({ lastEditedAt: '2026-09-01T00:00:00Z' }))).toBe('2026-10-01T00:00:00Z');
	});
});
