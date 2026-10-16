import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	THEME_COLORS,
	THEME_KEY,
	applyTheme,
	initTheme,
	readStoredTheme,
	resolveTheme,
	theme,
	toggleTheme
} from '../src/lib/theme.svelte';

const root = document.documentElement;
let systemDark = false;
let mediaListener: (() => void) | null = null;

function meta() {
	return document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
}

beforeEach(() => {
	localStorage.clear();
	root.removeAttribute('data-theme');
	root.removeAttribute('style');
	document.head.innerHTML = '<meta name="theme-color" content="#000000">';
	systemDark = false;
	mediaListener = null;
	vi.stubGlobal('matchMedia', (q: string) => ({
		matches: q.includes('dark') ? systemDark : !systemDark,
		addEventListener: (_: string, cb: () => void) => (mediaListener = cb),
		removeEventListener: () => (mediaListener = null)
	}));
});

afterEach(() => vi.restoreAllMocks());

describe('resolveTheme', () => {
	it('prefers a stored choice over the system', () => {
		expect(resolveTheme('light', true)).toBe('light');
		expect(resolveTheme('dark', false)).toBe('dark');
	});
	it('follows the system when nothing valid is stored', () => {
		expect(resolveTheme(null, true)).toBe('dark');
		expect(resolveTheme(null, false)).toBe('light');
		expect(resolveTheme('purple', true)).toBe('dark');
	});
});

describe('readStoredTheme', () => {
	it('reads a saved value', () => {
		localStorage.setItem(THEME_KEY, 'dark');
		expect(readStoredTheme()).toBe('dark');
	});
	it('returns null when storage throws', () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		expect(readStoredTheme()).toBeNull();
	});
});

describe('applyTheme', () => {
	it('sets data-theme, color-scheme, state and the theme-color meta', () => {
		applyTheme('dark');
		expect(root.dataset.theme).toBe('dark');
		expect(root.style.colorScheme).toBe('dark');
		expect(theme.current).toBe('dark');
		expect(meta().content).toBe(THEME_COLORS.dark);
		applyTheme('light');
		expect(meta().content).toBe(THEME_COLORS.light);
	});
	it('tolerates a page without a theme-color meta', () => {
		document.head.innerHTML = '';
		expect(() => applyTheme('dark')).not.toThrow();
	});
});

describe('toggleTheme', () => {
	it('flips the current theme and stores the choice', () => {
		applyTheme('light');
		toggleTheme();
		expect(root.dataset.theme).toBe('dark');
		expect(localStorage.getItem(THEME_KEY)).toBe('dark');
		toggleTheme();
		expect(root.dataset.theme).toBe('light');
		expect(localStorage.getItem(THEME_KEY)).toBe('light');
	});
	it('still switches when storage throws', () => {
		applyTheme('light');
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		expect(() => toggleTheme()).not.toThrow();
		expect(root.dataset.theme).toBe('dark');
	});
});

describe('initTheme', () => {
	it('applies the stored choice', () => {
		localStorage.setItem(THEME_KEY, 'dark');
		initTheme();
		expect(root.dataset.theme).toBe('dark');
	});
	it('follows the system when nothing is stored, and tracks changes', () => {
		systemDark = true;
		const stop = initTheme();
		expect(root.dataset.theme).toBe('dark');
		systemDark = false;
		mediaListener!();
		expect(root.dataset.theme).toBe('light');
		stop();
		expect(mediaListener).toBeNull();
	});
	it('ignores system changes once a choice is stored', () => {
		localStorage.setItem(THEME_KEY, 'light');
		initTheme();
		systemDark = true;
		mediaListener!();
		expect(root.dataset.theme).toBe('light');
	});
	it('syncs from another tab through the storage event', () => {
		const stop = initTheme();
		localStorage.setItem(THEME_KEY, 'dark');
		window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY, newValue: 'dark' }));
		expect(root.dataset.theme).toBe('dark');
		localStorage.removeItem(THEME_KEY);
		window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY, newValue: null }));
		expect(root.dataset.theme).toBe('light');
		window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: 'dark' }));
		expect(root.dataset.theme).toBe('light');
		stop();
		window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY, newValue: 'dark' }));
		expect(root.dataset.theme).toBe('light');
	});
});

// The pre-paint script in app.html cannot import modules, so run the real text.
describe('app.html pre-paint script', () => {
	const html = readFileSync(path.resolve(__dirname, '../src/app.html'), 'utf8');
	const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? '';

	function run() {
		new Function(script)();
	}

	it('sits in <head> before %sveltekit.head%', () => {
		expect(html.indexOf('<script>')).toBeGreaterThan(html.indexOf('<head>'));
		expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('%sveltekit.head%'));
	});
	it('applies the stored theme and meta colour', () => {
		localStorage.setItem(THEME_KEY, 'dark');
		run();
		expect(root.dataset.theme).toBe('dark');
		expect(meta().content).toBe(THEME_COLORS.dark);
	});
	it('follows the system when nothing is stored', () => {
		systemDark = true;
		run();
		expect(root.dataset.theme).toBe('dark');
		systemDark = false;
		run();
		expect(root.dataset.theme).toBe('light');
		expect(meta().content).toBe(THEME_COLORS.light);
	});
	it('falls back to the system when storage throws', () => {
		systemDark = true;
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		expect(run).not.toThrow();
		expect(root.dataset.theme).toBe('dark');
	});
	it('uses the same storage key and colours as the module', () => {
		expect(script).toContain(`'${THEME_KEY}'`);
		expect(script).toContain(THEME_COLORS.light);
		expect(script).toContain(THEME_COLORS.dark);
	});
});

describe('theme colours match the palette', () => {
	it('uses --fd-background of each theme', () => {
		const css = readFileSync(path.resolve(__dirname, '../src/routes/layout.css'), 'utf8');
		expect(css).toContain(`--fd-background: ${THEME_COLORS.light}`);
		expect(css).toContain(`--fd-background: ${THEME_COLORS.dark}`);
	});
});
