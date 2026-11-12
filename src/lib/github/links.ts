import { forumConfig } from '$lib/config';

/** Writing happens on GitHub itself, so images and drafts use GitHub's own editor and attachments. */
const discussions = () => `https://github.com/${forumConfig.repo.owner}/${forumConfig.repo.name}/discussions`;

/** GitHub's new-discussion form, with the topic preselected when one is known. */
export function newPostUrl(topic?: string | null): string {
	return topic ? `${discussions()}/new?category=${encodeURIComponent(topic)}` : `${discussions()}/new/choose`;
}

/** A discussion on GitHub, where comments, replies and edits are written. */
export function discussionUrl(number: number): string {
	return `${discussions()}/${number}`;
}
