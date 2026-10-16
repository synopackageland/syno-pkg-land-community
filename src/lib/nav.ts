/** "All discussions" is current only on the home page, not on every page without a topic. */
export function allDiscussionsActive(pathname: string, home: string): boolean {
	const trim = (path: string) => path.replace(/\/$/, '');
	return trim(pathname) === trim(home);
}
