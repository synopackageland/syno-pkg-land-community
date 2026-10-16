/**
 * Web Storage that never throws. Private modes, blocked site data and quota
 * limits make any access (even reading `window.localStorage`) throw; callers
 * treat that as "nothing stored" and carry on for this page view.
 */
function attempt<T>(fn: () => T, fallback: T): T {
	try {
		return fn();
	} catch {
		return fallback;
	}
}

function safeStore(area: () => Storage) {
	return {
		get: (key: string): string | null => attempt(() => area().getItem(key), null),
		/** false when the value could not be saved */
		set: (key: string, value: string): boolean =>
			attempt(() => {
				area().setItem(key, value);
				return true;
			}, false),
		remove: (key: string): void => attempt(() => area().removeItem(key), undefined),
		keys: (): string[] => attempt(() => Object.keys(area()), [])
	};
}

export const localStore = safeStore(() => localStorage);
export const sessionStore = safeStore(() => sessionStorage);
