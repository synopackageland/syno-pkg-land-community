<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { swr, writeCache } from '$lib/cache';
	import CommentCard from '$lib/components/CommentCard.svelte';
	import Loading from '$lib/components/Loading.svelte';
	import MarkdownEditor from '$lib/components/MarkdownEditor.svelte';
	import ReactionBar from '$lib/components/ReactionBar.svelte';
	import SignInPrompt from '$lib/components/SignInPrompt.svelte';
	import UserBadges from '$lib/components/UserBadges.svelte';
	import { forumConfig } from '$lib/config';
	import {
		addComment,
		deleteDiscussion,
		getDiscussion,
		isArticle,
		stripMarker,
		toggleUpvote,
		updateDiscussion
	} from '$lib/github/api';
	import { auth } from '$lib/github/auth.svelte';
	import type { Comment, Discussion, Reply } from '$lib/github/types';
	import { fetchArchivedDiscussion } from '$lib/archive/client';
	import { archiveMode, isMaintainer, postActionsMenu, ui } from '$lib/ui.svelte';
	import { formatDate, timeAgo } from '$lib/utils';

	let discussion = $state<Discussion | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let commentBody = $state('');
	let posting = $state(false);
	let postError = $state<string | null>(null);
	let upvoteBusy = $state(false);

	const number = $derived(Number(page.params.number));
	const article = $derived(discussion ? isArticle(discussion.body) : false);

	// GitHub only allows the author and users with repo write access to edit
	// or delete a discussion — mirror that in the UI
	const canModerate = $derived(
		!!discussion &&
			!!auth.viewer &&
			(auth.viewer.login === discussion.author?.login || isMaintainer())
	);
	const reportUrl = $derived(
		discussion
			? `https://github.com/contact/report-content?content_url=${encodeURIComponent(discussion.url)}`
			: '#'
	);

	// inline moderation editor
	let editing = $state(false);
	/** The phone-width ⋯ menu holding Edit/Delete/Report */
	let actionsOpen = $state(false);
	const actionsInMenu = $derived(postActionsMenu({ canModerate, editing }));
	let editTitle = $state('');
	let editCategoryId = $state('');
	let editBody = $state('');
	let editBusy = $state(false);
	let editError = $state<string | null>(null);

	function startEdit() {
		if (!discussion) return;
		editTitle = discussion.title;
		editCategoryId = discussion.category.id;
		editBody = stripMarker(discussion.body);
		editError = null;
		editing = true;
	}

	async function saveEdit(e: SubmitEvent) {
		e.preventDefault();
		if (!discussion || !editTitle.trim() || !editBody.trim()) return;
		editBusy = true;
		editError = null;
		try {
			// preserve the post's article/post type
			const body = article
				? `${forumConfig.content.articles.marker}\n\n${editBody}`
				: editBody;
			const updated = await updateDiscussion(discussion.id, {
				title: editTitle.trim(),
				body,
				categoryId: editCategoryId
			});
			Object.assign(discussion, updated);
			persist();
			editing = false;
		} catch (err) {
			editError = err instanceof Error ? err.message : 'Failed to save changes.';
		} finally {
			editBusy = false;
		}
	}

	let deleteBusy = $state(false);
	async function removeDiscussion() {
		if (!discussion || deleteBusy) return;
		if (!confirm('Permanently delete this post and all its comments?')) return;
		deleteBusy = true;
		try {
			await deleteDiscussion(discussion.id);
			await goto(resolve('/'));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete the post.';
			deleteBusy = false;
		}
	}

	let loadedFor: number | null = null;
	$effect(() => {
		if (
			(auth.signedIn || (!auth.loading && archiveMode())) &&
			Number.isFinite(number) &&
			loadedFor !== number
		) {
			loadedFor = number;
			load();
		}
	});

	async function load() {
		loading = true;
		error = null;
		// read-only archive mode: serve the archived snapshot of the thread
		if (archiveMode()) {
			discussion = await fetchArchivedDiscussion(number);
			if (!discussion) {
				error = 'This post is not in the read-only archive yet — sign in to view it live.';
			}
			loading = false;
			return;
		}
		try {
			await swr(`discussion:${number}`, () => getDiscussion(number), (fresh) => {
				discussion = fresh;
				loading = false;
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load discussion.';
		} finally {
			loading = false;
		}
	}

	/** Persist the locally-updated thread so the cache stays fresh */
	function persist() {
		if (discussion) writeCache(`discussion:${number}`, $state.snapshot(discussion));
	}

	async function submitComment(e: SubmitEvent) {
		e.preventDefault();
		if (!discussion || !commentBody.trim()) return;
		posting = true;
		postError = null;
		try {
			// the mutation returns the created comment — insert it directly
			// instead of refetching the whole thread
			const created = await addComment(discussion.id, commentBody);
			discussion.comments.nodes.push({
				...created,
				isAnswer: false,
				replies: { totalCount: 0, nodes: [] }
			});
			discussion.comments.totalCount += 1;
			commentBody = '';
			persist();
		} catch (err) {
			postError = err instanceof Error ? err.message : 'Failed to post comment.';
		} finally {
			posting = false;
		}
	}

	function onReplyPosted(comment: Comment, reply: Reply) {
		comment.replies.nodes.push(reply);
		comment.replies.totalCount += 1;
		persist();
	}

	async function upvote() {
		if (!auth.signedIn) {
			ui.signInOpen = true;
			return;
		}
		if (!discussion || upvoteBusy) return;
		upvoteBusy = true;
		const on = !discussion.viewerHasUpvoted;
		discussion.viewerHasUpvoted = on;
		discussion.upvoteCount += on ? 1 : -1;
		try {
			await toggleUpvote(discussion.id, on);
		} catch {
			discussion.viewerHasUpvoted = !on;
			discussion.upvoteCount += on ? -1 : 1;
		} finally {
			upvoteBusy = false;
		}
	}
</script>

<!-- Edit/Delete/Report, inline on wide screens and in the ⋯ menu on phones -->
{#snippet postActions(cls: string)}
	{#if canModerate && !editing}
		<button
			type="button"
			onclick={() => {
				actionsOpen = false;
				startEdit();
			}}
			class={cls}
		>
			Edit
		</button>
		<button
			type="button"
			onclick={() => {
				actionsOpen = false;
				removeDiscussion();
			}}
			disabled={deleteBusy}
			class="{cls} text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400"
		>
			{deleteBusy ? 'Deleting…' : 'Delete'}
		</button>
	{/if}
	<a
		href={reportUrl}
		target="_blank"
		rel="noreferrer"
		title="Report this content to GitHub"
		onclick={() => (actionsOpen = false)}
		class={cls}
	>
		Report
	</a>
{/snippet}

<svelte:head>
	<title>{discussion ? `${discussion.title} — ${forumConfig.site.name}` : forumConfig.site.name}</title>
</svelte:head>

{#if auth.loading}
	<Loading />
{:else if !auth.signedIn && !archiveMode()}
	<SignInPrompt />
{:else if loading}
	<Loading />
{:else if error || !discussion}
	<div class="panel px-6 py-14 text-center">
		<p class="font-medium">{error ?? 'Discussion not found.'}</p>
		<a href={resolve('/')} class="mt-2 inline-block text-sm text-fd-link hover:underline">
			Back to all discussions
		</a>
	</div>
{:else}
	<article class={article ? 'mx-auto max-w-3xl' : ''}>
		<nav class="mb-3 text-[12.5px] text-fd-muted-foreground" aria-label="Breadcrumb">
			<a href={resolve('/')} class="hover:text-fd-foreground">Forum</a>
			<span class="mx-1" aria-hidden="true">/</span>
			<a href={resolve('/t/[slug]', { slug: discussion.category.slug })} class="hover:text-fd-foreground">
				{discussion.category.name}
			</a>
		</nav>

		<div class="panel px-5 py-5 sm:px-8 sm:py-7">
			{#if article}
				<p class="mb-2 text-[12.5px] font-medium text-fd-link">Article</p>
				<h1 class="text-[28px] leading-tight font-semibold tracking-[-0.025em] sm:text-[32px]">{discussion.title}</h1>
			{:else}
				<h1 class="text-[22px] leading-tight font-semibold tracking-[-0.02em] sm:text-[24px]">{discussion.title}</h1>
			{/if}

			<div class="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[13px] text-fd-muted-foreground">
				{#if discussion.author}
					<span class="inline-flex items-center gap-2">
						<img
							src={discussion.author.avatarUrl}
							alt=""
							class="size-6 rounded-full ring-1 ring-fd-border"
						/>
						<a
							href={resolve('/u/[login]', { login: discussion.author.login })}
							class="font-medium text-fd-foreground hover:underline"
						>
							{discussion.author.login}
						</a>
						<UserBadges login={discussion.author.login} />
					</span>
				{/if}
				<time datetime={discussion.createdAt} title={formatDate(discussion.createdAt)}>{timeAgo(discussion.createdAt)}</time>
				{#if discussion.locked}
					<span class="badge gap-1 bg-fd-muted text-fd-muted-foreground">
						<svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
						Locked
					</span>
				{/if}
				{#if ui.pinned.some((p) => p.number === discussion?.number)}
					<span class="badge bg-fd-muted text-fd-muted-foreground">Pinned</span>
				{/if}

				<span class="ml-auto items-center gap-0.5 {actionsInMenu ? 'hidden sm:inline-flex' : 'inline-flex'}">
					{@render postActions('btn btn-quiet h-7 px-2 text-[12.5px]')}
				</span>
				{#if actionsInMenu}
					<details class="relative ml-auto sm:hidden" bind:open={actionsOpen}>
						<summary
							class="flex size-7 cursor-pointer list-none items-center justify-center rounded-md hover:bg-fd-muted [&::-webkit-details-marker]:hidden"
							aria-label="Post actions"
						>
							<svg class="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
						</summary>
						<div class="absolute right-0 z-50 mt-1 flex w-40 flex-col rounded-lg border border-fd-border bg-fd-card p-1 shadow-float">
							{@render postActions('btn btn-quiet h-9 w-full justify-start px-2.5 text-sm')}
						</div>
					</details>
				{/if}
			</div>

			{#if editing}
				<form onsubmit={saveEdit} class="mt-6 flex flex-col gap-4">
					<div>
						<label class="mb-1 block text-[13px] font-medium" for="dk-edit-title">Title</label>
						<input id="dk-edit-title" type="text" bind:value={editTitle} maxlength="256" class="field" />
					</div>
					<div>
						<label class="mb-1 block text-[13px] font-medium" for="dk-edit-topic">Topic</label>
						<select id="dk-edit-topic" bind:value={editCategoryId} class="field sm:max-w-xs">
							{#each ui.categories as category (category.id)}
								<option value={category.id}>{category.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<span class="mb-1 block text-[13px] font-medium">Body</span>
						<MarkdownEditor bind:value={editBody} rows={10} />
					</div>
					{#if editError}
						<p class="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600 dark:text-red-400">{editError}</p>
					{/if}
					<div class="flex justify-end gap-2">
						<button type="button" onclick={() => (editing = false)} class="btn btn-quiet">Cancel</button>
						<button
							type="submit"
							disabled={editBusy || !editTitle.trim() || !editBody.trim()}
							class="btn btn-primary"
						>
							{editBusy ? 'Saving…' : 'Save changes'}
						</button>
					</div>
				</form>
			{:else}
				<div class="markdown mt-6 {article ? 'text-base leading-8' : ''}">
					{@html discussion.bodyHTML}
				</div>
			{/if}

			{#if forumConfig.features.upvotes || forumConfig.features.reactions}
				<div class="mt-6 flex flex-wrap items-center gap-2">
					{#if forumConfig.features.upvotes}
					<button
						type="button"
						onclick={upvote}
						aria-pressed={discussion.viewerHasUpvoted}
						class="tabular inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[13px] transition-colors {discussion.viewerHasUpvoted
							? 'border-fd-ring/50 bg-fd-accent font-medium text-fd-accent-foreground'
							: 'border-fd-border hover:bg-fd-muted'}"
					>
						<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6" /></svg>
						<span class="sr-only">Upvote,</span>{discussion.upvoteCount}
					</button>
					{/if}
					{#if forumConfig.features.reactions}
						<ReactionBar subjectId={discussion.id} groups={discussion.reactionGroups} />
					{/if}
				</div>
			{/if}
		</div>

		<section class="mt-8" aria-labelledby="comments-heading">
			<h2 id="comments-heading" class="mb-3 text-[15px] font-semibold tracking-[-0.01em]">
				{discussion.comments.totalCount}
				{discussion.comments.totalCount === 1 ? 'comment' : 'comments'}
			</h2>

			{#if discussion.comments.nodes.length > 0}
				<div class="panel divide-y divide-fd-border">
					{#each discussion.comments.nodes as comment (comment.id)}
						<CommentCard
							{comment}
							discussionId={discussion.id}
							locked={discussion.locked}
							onposted={(reply) => onReplyPosted(comment, reply)}
						/>
					{/each}
				</div>
			{/if}

			{#if discussion.locked}
				<p class="mt-4 rounded-lg bg-fd-muted px-4 py-3 text-[13px] text-fd-muted-foreground">
					This discussion is locked. New comments are disabled.
				</p>
			{:else if !auth.signedIn}
				<div class="mt-4 rounded-lg bg-fd-muted px-4 py-3 text-[13px] text-fd-muted-foreground">
					You're viewing a read-only snapshot.
					<button
						type="button"
						onclick={() => (ui.signInOpen = true)}
						class="font-medium text-fd-link hover:underline"
					>
						Sign in
					</button>
					to join the discussion.
				</div>
			{:else}
				<form onsubmit={submitComment} class="mt-5">
					<h3 class="mb-2 text-[13px] font-medium">Add a comment</h3>
					<MarkdownEditor bind:value={commentBody} />
					{#if postError}<p class="mt-2 text-sm text-red-600 dark:text-red-400">{postError}</p>{/if}
					<div class="mt-3 flex justify-end">
						<button type="submit" disabled={posting || !commentBody.trim()} class="btn btn-primary">
							{posting ? 'Posting…' : 'Comment'}
						</button>
					</div>
				</form>
			{/if}
		</section>
	</article>
{/if}
