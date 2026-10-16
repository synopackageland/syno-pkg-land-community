/** "3h ago" style relative timestamps */
export function timeAgo(iso: string): string {
	const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
	if (seconds < 60) return 'just now';
	const units: [number, string][] = [
		[60 * 60 * 24 * 365, 'y'],
		[60 * 60 * 24 * 30, 'mo'],
		[60 * 60 * 24 * 7, 'w'],
		[60 * 60 * 24, 'd'],
		[60 * 60, 'h']
	];
	for (const [size, label] of units) {
		if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`;
	}
	return `${Math.floor(seconds / 60)}m ago`;
}

export function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

/** Rough plain-text excerpt from raw markdown for list previews */
export function excerpt(markdown: string, length = 160, title = ''): string {
	const text = withoutRepeatedVersion(withoutLeadingTitle(plainText(markdown), title), title);
	return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

function plainText(markdown: string): string {
	return markdown
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/```[\s\S]*?```/g, '')
		.replace(/^#{1,6}[ \t]*(?:en|zh-[A-Za-z]+)[ \t]*$/gm, '')
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/^\s*(?:[-*+]\s+|-{3,}\s*$)/gm, '')
		.replace(/[#>*_`~|]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Bodies often open by repeating the title; that copy adds nothing to a list row. */
function withoutLeadingTitle(text: string, title: string): string {
	if (!title || !text.startsWith(title)) return text;
	const rest = text.slice(title.length);
	return /^(\s|$)/.test(rest) ? rest.trim() : text;
}

/** Release posts repeat the version right after the title; the summary starts after it. */
function withoutRepeatedVersion(text: string, title: string): string {
	const version = title.match(/\d+(?:\.\d+)+(?:-\d+)?/)?.[0];
	if (!version || !text.startsWith(version)) return text;
	const rest = text.slice(version.length);
	return /^(\s|$)/.test(rest) ? rest.trim() : text;
}
