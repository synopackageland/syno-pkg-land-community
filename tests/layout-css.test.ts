import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(path.resolve(__dirname, '../src/routes/layout.css'), 'utf8');

describe('shared control styles', () => {
	// Unlayered rules beat Tailwind utilities, so `class="field pl-8"` would lose its padding.
	it.each(['.btn', '.btn-primary', '.btn-quiet', '.btn-outline', '.field', '.panel', '.badge'])(
		'%s lives in the components layer so utilities can override it',
		(selector) => {
			const layer = css.indexOf('@layer components {');
			expect(layer).toBeGreaterThan(-1);
			const end = css.indexOf('\n}\n', layer);
			expect(css.slice(layer, end)).toContain(`${selector} {`);
			expect(css.slice(0, layer) + css.slice(end)).not.toContain(`\n${selector} {`);
		}
	);
});
