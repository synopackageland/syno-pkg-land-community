import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { localStore, sessionStore } from '$lib/storage';

beforeEach(() => {
	localStorage.clear();
	sessionStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe.each([
	['localStore', localStore, () => localStorage, 'localStorage'],
	['sessionStore', sessionStore, () => sessionStorage, 'sessionStorage']
] as const)('%s', (_name, store, area, global) => {
	it('reads, writes and removes values', () => {
		expect(store.get('k')).toBeNull();
		expect(store.set('k', 'v')).toBe(true);
		expect(area().getItem('k')).toBe('v');
		expect(store.get('k')).toBe('v');
		store.remove('k');
		expect(store.get('k')).toBeNull();
	});

	it('lists keys', () => {
		store.set('a', '1');
		store.set('b', '2');
		expect(store.keys().sort()).toEqual(['a', 'b']);
	});

	it('degrades quietly when the methods throw (quota, blocked)', () => {
		const boom = () => {
			throw new DOMException('blocked', 'SecurityError');
		};
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom);
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom);
		vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(boom);
		expect(store.get('k')).toBeNull();
		expect(store.set('k', 'v')).toBe(false);
		expect(() => store.remove('k')).not.toThrow();
	});

	it('degrades quietly when the storage object itself is inaccessible', () => {
		vi.spyOn(window, global as 'localStorage', 'get').mockImplementation(() => {
			throw new DOMException('blocked', 'SecurityError');
		});
		expect(store.get('k')).toBeNull();
		expect(store.set('k', 'v')).toBe(false);
		expect(store.keys()).toEqual([]);
		expect(() => store.remove('k')).not.toThrow();
	});
});
