import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// The forum UI is English only: no CJK in any string, comment or meta tag.
const root = path.resolve(__dirname, '..');
const CJK = /[　-〿぀-ヿ㐀-鿿＀-￯]/;

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const full = path.join(dir, name);
		if (statSync(full).isDirectory()) return name === 'assets' ? [] : walk(full);
		return /\.(svelte|ts|html|txt)$/.test(name) ? [full] : [];
	});
}

const files = [
	...walk(path.join(root, 'src')),
	...walk(path.join(root, 'worker')),
	path.join(root, 'forum.config.ts'),
	path.join(root, 'static/robots.txt')
];

describe('UI strings', () => {
	it('scans the app, worker and config', () => {
		expect(files.length).toBeGreaterThan(20);
	});
	it.each(files.map((f) => [path.relative(root, f), f]))('%s has no CJK text', (_name, file) => {
		const offending = readFileSync(file, 'utf8')
			.split('\n')
			.filter((line) => CJK.test(line));
		expect(offending).toEqual([]);
	});
});
