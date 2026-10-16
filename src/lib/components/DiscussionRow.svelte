<script lang="ts">
	import { resolve } from '$app/paths';
	import { forumConfig } from '$lib/config';
	import { isArticle } from '$lib/github/api';
	import type { DiscussionListItem } from '$lib/github/types';
	import { excerpt, formatDate, timeAgo } from '$lib/utils';
	import UserBadges from './UserBadges.svelte';

	let {
		discussion,
		showCategory = true
	}: { discussion: DiscussionListItem; showCategory?: boolean } = $props();

	const article = $derived(isArticle(discussion.body));
	const href = $derived(resolve('/d/[number]', { number: String(discussion.number) }));
</script>

<!-- The whole row is clickable via the title's stretched overlay link; the
     author avatar/name are separate links (to the profile page) layered above
     it, since anchors can't nest. -->
<li class="group relative flex gap-3 px-4 py-3 transition-colors hover:bg-fd-muted/50 sm:px-5">
	{#if discussion.author}
		<a
			href={resolve('/u/[login]', { login: discussion.author.login })}
			class="relative z-10 mt-0.5 shrink-0 self-start rounded-full"
			title="View @{discussion.author.login}'s profile"
		>
			<img
				src={discussion.author.avatarUrl}
				alt={discussion.author.login}
				class="size-8 rounded-full ring-1 ring-fd-border"
				loading="lazy"
			/>
		</a>
	{:else}
		<div class="mt-0.5 size-8 shrink-0 rounded-full bg-fd-muted"></div>
	{/if}

	<div class="min-w-0 flex-1">
		<div class="flex items-baseline gap-2">
			<h3 class="min-w-0 truncate text-[14.5px] leading-snug font-medium tracking-[-0.005em]">
				<a {href} class="after:absolute after:inset-0 group-hover:text-fd-link">
					{discussion.title}
				</a>
			</h3>
			{#if article}
				<span class="badge shrink-0 bg-fd-muted text-fd-muted-foreground">Article</span>
			{/if}
		</div>
		{#if forumConfig.content.listExcerpts && discussion.body}
			<p class="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-fd-muted-foreground sm:line-clamp-1">
				{excerpt(discussion.body, undefined, discussion.title)}
			</p>
		{/if}
		<div class="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-fd-muted-foreground">
			{#if discussion.author}
				<span class="inline-flex items-center gap-1.5">
					<a
						href={resolve('/u/[login]', { login: discussion.author.login })}
						class="relative z-10 font-medium text-fd-foreground/80 hover:underline"
					>
						{discussion.author.login}
					</a>
					<UserBadges login={discussion.author.login} />
				</span>
			{/if}
			<time datetime={discussion.createdAt} title={formatDate(discussion.createdAt)}>{timeAgo(discussion.createdAt)}</time>
			{#if showCategory}
				<span class="hidden sm:inline">in {discussion.category.name}</span>
			{/if}
			<span class="tabular inline-flex items-center gap-1 sm:hidden">
				<svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 1 1 16.1-3.8z" /></svg>
				<span class="sr-only">Comments:</span>{discussion.comments.totalCount}
			</span>
		</div>
	</div>

	<div class="tabular hidden shrink-0 flex-col items-end gap-1 pt-0.5 sm:flex text-[12px] text-fd-muted-foreground">
		<span class="inline-flex items-center gap-1" title="Comments">
			<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 1 1 16.1-3.8z" /></svg>
			<span class="sr-only">Comments:</span>{discussion.comments.totalCount}
		</span>
		{#if forumConfig.features.upvotes}
			<span class="inline-flex items-center gap-1" title="Upvotes">
				<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6" /></svg>
				<span class="sr-only">Upvotes:</span>{discussion.upvoteCount}
			</span>
		{/if}
	</div>
</li>
