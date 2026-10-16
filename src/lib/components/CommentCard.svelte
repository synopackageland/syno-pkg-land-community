<script lang="ts">
	import { resolve } from '$app/paths';
	import { forumConfig } from '$lib/config';
	import { addComment } from '$lib/github/api';
	import { auth } from '$lib/github/auth.svelte';
	import type { Comment, Reply } from '$lib/github/types';
	import { ui } from '$lib/ui.svelte';
	import { timeAgo } from '$lib/utils';
	import MarkdownEditor from './MarkdownEditor.svelte';
	import ReactionBar from './ReactionBar.svelte';
	import UserBadges from './UserBadges.svelte';

	let {
		comment,
		discussionId,
		locked = false,
		onposted
	}: {
		comment: Comment;
		discussionId: string;
		locked?: boolean;
		/** Called with the created reply — the parent inserts it into the thread */
		onposted: (reply: Reply) => void;
	} = $props();

	let replying = $state(false);
	let replyBody = $state('');
	let busy = $state(false);
	let error = $state<string | null>(null);

	function startReply() {
		if (!auth.signedIn) {
			ui.signInOpen = true;
			return;
		}
		replying = true;
	}

	async function submitReply(e: SubmitEvent) {
		e.preventDefault();
		if (!replyBody.trim()) return;
		busy = true;
		error = null;
		try {
			const reply = await addComment(discussionId, replyBody, comment.id);
			replyBody = '';
			replying = false;
			onposted(reply);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to post reply.';
		} finally {
			busy = false;
		}
	}
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
			<button type="button" onclick={startReply} class="btn btn-quiet ml-auto h-7 px-2 text-[12.5px]">
				Reply
			</button>
		{/if}
	</div>

	{#if comment.replies.nodes.length > 0 || replying}
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

			{#if replying}
				<form onsubmit={submitReply}>
					<MarkdownEditor bind:value={replyBody} rows={3} placeholder="Write a reply…" />
					{#if error}<p class="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>{/if}
					<div class="mt-2 flex justify-end gap-2">
						<button type="button" onclick={() => (replying = false)} class="btn btn-quiet">Cancel</button>
						<button type="submit" disabled={busy || !replyBody.trim()} class="btn btn-primary">
							{busy ? 'Posting…' : 'Post reply'}
						</button>
					</div>
				</form>
			{/if}
		</div>
	{/if}
</article>
