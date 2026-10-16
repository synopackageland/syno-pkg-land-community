import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Guards WCAG AA (4.5:1) for every text/surface pair in both palettes.
const css = readFileSync(path.resolve(__dirname, '../src/routes/layout.css'), 'utf8');

function tokens(block: string): Record<string, string> {
	return Object.fromEntries([...block.matchAll(/--fd-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
}

const lightStart = css.indexOf(':root {');
const darkStart = css.indexOf(":root[data-theme='dark'] {", lightStart);
const light = tokens(css.slice(lightStart, darkStart));
const dark = tokens(css.slice(darkStart, css.indexOf('@theme inline')));

function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5]
		.map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
		.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

const pairs: [string, string][] = [
	['foreground', 'background'],
	['foreground', 'card'],
	['muted-foreground', 'background'],
	['muted-foreground', 'card'],
	['muted-foreground', 'muted'],
	['link', 'card'],
	['link', 'background'],
	['primary-foreground', 'primary'],
	['accent-foreground', 'accent']
];

describe.each([
	['light', light],
	['dark', dark]
])('%s palette', (_name, palette) => {
	it('defines every token the pairs use', () => {
		for (const [fg, bg] of pairs) {
			expect(palette[fg], fg).toMatch(/^#/);
			expect(palette[bg], bg).toMatch(/^#/);
		}
	});

	it.each(pairs)('%s on %s meets 4.5:1', (fg, bg) => {
		expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
	});
});
