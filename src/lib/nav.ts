/** "All discussions" is current only on the home page, not on every page without a topic. */
export function allDiscussionsActive(pathname: string, home: string): boolean {
	const trim = (path: string) => path.replace(/\/$/, '');
	return trim(pathname) === trim(home);
}

export type TopicIcon = 'list' | 'message' | 'megaphone' | 'drive' | 'link' | 'download' | 'package' | 'hash';

const VISUALS: Record<string, { icon: TopicIcon; tint: string }> = {
	announcements: { icon: 'megaphone', tint: 'text-fd-tag-amber' },
	general: { icon: 'message', tint: 'text-fd-tag-slate' },
	reclaim: { icon: 'drive', tint: 'text-fd-tag-teal' },
	connect: { icon: 'link', tint: 'text-fd-tag-violet' },
	'download-hub': { icon: 'download', tint: 'text-fd-tag-sky' },
	'third-party': { icon: 'package', tint: 'text-fd-tag-rose' }
};

/** Icon and soft tint for a topic (tint is a literal Tailwind class so it is generated). */
export function topicVisual(slug: string): { icon: TopicIcon; tint: string } {
	return VISUALS[slug] ?? { icon: 'hash', tint: 'text-fd-tag-slate' };
}

const PACKAGE_TOPICS = ['reclaim', 'connect', 'download-hub', 'third-party'];
const NEWS_TOPICS = ['announcements'];

/** Sidebar sections; Discussions always exists because it holds the all-topics link. */
export function sidebarGroups<T extends { slug: string }>(categories: T[]): { label: string; items: T[] }[] {
	const pick = (slugs: string[]) =>
		slugs.flatMap((slug) => categories.filter((c) => c.slug === slug));
	const rest = categories.filter((c) => ![...PACKAGE_TOPICS, ...NEWS_TOPICS].includes(c.slug));
	const groups = [
		{ label: 'Discussions', items: rest },
		{ label: 'Packages', items: pick(PACKAGE_TOPICS) },
		{ label: 'News', items: pick(NEWS_TOPICS) }
	];
	return groups.filter((g, i) => i === 0 || g.items.length > 0);
}
