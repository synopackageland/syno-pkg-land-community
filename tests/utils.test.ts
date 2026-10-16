import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { excerpt, formatDate, timeAgo } from '$lib/utils';

describe('timeAgo', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-19T12:00:00Z'));
	});
	afterEach(() => vi.useRealTimers());

	const at = (secondsAgo: number) =>
		new Date(Date.now() - secondsAgo * 1000).toISOString();

	it('returns "just now" for under a minute', () => {
		expect(timeAgo(at(5))).toBe('just now');
		expect(timeAgo(at(59))).toBe('just now');
	});

	it('formats minutes, hours, days, weeks, months and years', () => {
		expect(timeAgo(at(60))).toBe('1m ago');
		expect(timeAgo(at(60 * 59))).toBe('59m ago');
		expect(timeAgo(at(3600 * 3))).toBe('3h ago');
		expect(timeAgo(at(86400 * 2))).toBe('2d ago');
		expect(timeAgo(at(86400 * 7))).toBe('1w ago');
		expect(timeAgo(at(86400 * 40))).toBe('1mo ago');
		expect(timeAgo(at(86400 * 800))).toBe('2y ago');
	});

	it('treats future timestamps as "just now"', () => {
		expect(timeAgo(at(-100))).toBe('just now');
	});
});

describe('formatDate', () => {
	it('renders a locale date containing the year', () => {
		expect(formatDate('2026-01-15T00:00:00Z')).toContain('2026');
	});
});

describe('excerpt', () => {
	it('strips HTML comments (the article marker)', () => {
		expect(excerpt('<!-- dk:article -->\n\nHello world')).toBe('Hello world');
	});

	it('strips fenced code blocks', () => {
		expect(excerpt('before\n```js\nconst x = 1;\n```\nafter')).toBe('before after');
	});

	it('drops images but keeps link text', () => {
		expect(excerpt('![alt](http://x/y.png) see [the docs](http://x)')).toBe('see the docs');
	});

	it('removes markdown formatting characters', () => {
		expect(excerpt('# Title\n> quote *bold* `code`')).toBe('Title quote bold code');
	});

	it('keeps hyphens inside words while dropping list markers and rules', () => {
		expect(excerpt('Download Hub 0.2.2-0037\n\n- first-time setup\n* item\n---\nend')).toBe(
			'Download Hub 0.2.2-0037 first-time setup item end'
		);
	});

	it('truncates long text with an ellipsis', () => {
		const out = excerpt('word '.repeat(100), 20);
		expect(out.length).toBeLessThanOrEqual(21);
		expect(out.endsWith('…')).toBe(true);
	});

	it('drops a leading copy of the title', () => {
		expect(excerpt('Download Hub **0.2.2-0037**\n\nRemoving the entry', 160, 'Download Hub 0.2.2-0037')).toBe(
			'Removing the entry'
		);
	});

	it('keeps text that only shares a prefix with the title', () => {
		expect(excerpt('Download Hubs are great', 160, 'Download Hub')).toBe('Download Hubs are great');
		expect(excerpt('Other text', 160, 'Download Hub')).toBe('Other text');
	});

	it('skips a language heading and the version it repeats', () => {
		const body = '<!-- m -->\n\nDownload Hub **0.2.2-0037**\n\n### en\n\n0.2.2-0037\n- Removing the entry asks for confirmation.\n\n### zh-TW\n\nx';
		expect(excerpt(body, 160, 'Download Hub 0.2.2-0037')).toBe('Removing the entry asks for confirmation. x');
	});

	it('keeps a version that the title does not carry', () => {
		expect(excerpt('0.3.0 is out', 160, 'Release notes')).toBe('0.3.0 is out');
	});

	it('keeps text that only shares a prefix with the version', () => {
		expect(excerpt('0.3.01 is out', 160, 'Release 0.3.0')).toBe('0.3.01 is out');
		expect(excerpt('0.3.0', 160, 'Release 0.3.0')).toBe('');
	});

	it('does not treat prose starting with a language code as a heading', () => {
		expect(excerpt('en route to the hub', 160, 'Trip')).toBe('en route to the hub');
	});

	it('returns short text unchanged', () => {
		expect(excerpt('short text')).toBe('short text');
	});
});
