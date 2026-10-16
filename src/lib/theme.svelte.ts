export type Theme = 'light' | 'dark';

/** Same key the pre-paint script in app.html reads. */
export const THEME_KEY = 'dk:theme';

/** Page background of each theme; keeps the browser chrome in step (--fd-background). */
export const THEME_COLORS: Record<Theme, string> = { light: '#f6f7f9', dark: '#0f1217' };

export const theme = $state<{ current: Theme }>({ current: 'light' });

/** A stored choice wins; otherwise follow the system. */
export function resolveTheme(stored: string | null, systemDark: boolean): Theme {
	if (stored === 'light' || stored === 'dark') return stored;
	return systemDark ? 'dark' : 'light';
}

/** Storage can throw (private mode, blocked site data); treat that as "no choice". */
export function readStoredTheme(): string | null {
	try {
		return localStorage.getItem(THEME_KEY);
	} catch {
		return null;
	}
}

const systemQuery = () => matchMedia('(prefers-color-scheme: dark)');

function resolveNow(): Theme {
	return resolveTheme(readStoredTheme(), systemQuery().matches);
}

export function applyTheme(next: Theme) {
	const root = document.documentElement;
	root.dataset.theme = next;
	root.style.colorScheme = next;
	document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[next]);
	theme.current = next;
}

export function toggleTheme() {
	const next: Theme = theme.current === 'dark' ? 'light' : 'dark';
	applyTheme(next);
	try {
		localStorage.setItem(THEME_KEY, next);
	} catch {
		// the choice still applies for this page view
	}
}

/**
 * Sync state with the pre-paint script, then follow system changes (while no
 * choice is stored) and choices made in other tabs. Returns the cleanup.
 */
export function initTheme(): () => void {
	applyTheme(resolveNow());
	const media = systemQuery();
	const onSystem = () => {
		if (readStoredTheme() === null) applyTheme(resolveNow());
	};
	const onStorage = (e: StorageEvent) => {
		if (e.key === THEME_KEY) applyTheme(resolveNow());
	};
	media.addEventListener('change', onSystem);
	window.addEventListener('storage', onStorage);
	return () => {
		media.removeEventListener('change', onSystem);
		window.removeEventListener('storage', onStorage);
	};
}
