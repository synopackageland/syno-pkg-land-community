import { forumConfig } from '$lib/config';

/** Writing happens on GitHub itself, so images and drafts use GitHub's own editor and attachments. */
const discussions = () => `https://github.com/${forumConfig.repo.owner}/${forumConfig.repo.name}/discussions`;

/** GitHub's new-discussion form for a topic; General when the visitor is not inside one. */
export function newPostUrl(topic?: string | null): string {
	return `${discussions()}/new?category=${encodeURIComponent(topic || 'general')}`;
}

/** A discussion on GitHub, where comments, replies and edits are written. */
export function discussionUrl(number: number): string {
	return `${discussions()}/${number}`;
}
