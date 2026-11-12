<script lang="ts">
	import { resolve } from '$app/paths';
	import { forumConfig } from '$lib/config';
	import type { Comment } from '$lib/github/types';
	import { timeAgo } from '$lib/utils';
	import ReactionBar from './ReactionBar.svelte';
	import UserBadges from './UserBadges.svelte';

	let {
		comment,
		discussionUrl,
		locked = false
	}: {
		comment: Comment;
		/** Fallback for archived comments that carry no permalink of their own */
		discussionUrl: string;
		locked?: boolean;
	} = $props();
</script>

{#snippet authorLine(author: Comment['author'], createdAt: string, size = 'size-6')}
	{#if author}
		<img src={author.avatarUrl} alt="" class="{size} rounded-full ring-1 ring-fd-border" loading="lazy" />
		<a
			href={resolve('/u/[login]', { login: author.login })}
			class="text-[13px] font-medium hover:underline"
		>
			{author.login}
		</a>
		<UserBadges login={author.login} />
	{:else}
		<div class="{size} rounded-full bg-fd-muted"></div>
		<span class="text-[13px] font-medium text-fd-muted-foreground">ghost</span>
	{/if}
	<time datetime={createdAt} class="text-[12px] text-fd-muted-foreground">{timeAgo(createdAt)}</time>
{/snippet}

<article class="px-4 py-4 sm:px-6 {comment.isAnswer ? 'bg-green-500/5' : ''}" id={comment.id}>
	<div class="flex items-center gap-2">
		{@render authorLine(comment.author, comment.createdAt)}
		{#if comment.isAnswer}
			<span class="badge ml-auto gap-1 bg-green-500/10 text-green-700 dark:text-green-400">
				<svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
				Answer
			</span>
		{/if}
	</div>

	<div class="markdown mt-2 pl-8">
		{@html comment.bodyHTML}
	</div>

	<div class="mt-2.5 flex items-center gap-3 pl-8">
		{#if forumConfig.features.reactions}
			<ReactionBar subjectId={comment.id} groups={comment.reactionGroups} />
		{/if}
		{#if !locked}
			<a
				href={comment.url ?? discussionUrl}
				target="_blank" rel="noopener noreferrer"
				title="Replies are written on GitHub"
				class="btn btn-quiet ml-auto h-7 px-2 text-[12.5px]"
			>
				Reply on GitHub
			</a>
		{/if}
	</div>

	{#if comment.replies.nodes.length > 0}
		<div class="mt-3 ml-8 space-y-4 border-l-2 border-fd-border pl-4">
			{#each comment.replies.nodes as reply (reply.id)}
				<div class="min-w-0">
					<div class="flex items-center gap-2">
						{@render authorLine(reply.author, reply.createdAt, 'size-5')}
					</div>
					<div class="markdown mt-1 text-[14px]">
						{@html reply.bodyHTML}
					</div>
					{#if forumConfig.features.reactions}
						<div class="mt-1.5">
							<ReactionBar subjectId={reply.id} groups={reply.reactionGroups} />
						</div>
					{/if}
				</div>
			{/each}

		</div>
	{/if}
</article>
