interface Timed {
	createdAt: string;
}
interface Thread extends Timed {
	lastEditedAt: string | null;
	comments: { nodes: (Timed & { replies: { nodes: Timed[] } })[] };
}

/** When a discussion last changed: its own edit, or its newest comment or reply. */
export function lastActivityAt(d: Thread): string {
	const times = [d.createdAt, d.lastEditedAt ?? d.createdAt];
	for (const c of d.comments.nodes) times.push(c.createdAt, ...c.replies.nodes.map((r) => r.createdAt));
	return times.reduce((a, t) => (t > a ? t : a));
}
