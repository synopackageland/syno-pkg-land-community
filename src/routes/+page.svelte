<script lang="ts">
	import { resolve } from '$app/paths';
	import DiscussionRow from '$lib/components/DiscussionRow.svelte';
	import Loading from '$lib/components/Loading.svelte';
	import PinnedList from '$lib/components/PinnedList.svelte';
	import SignInPrompt from '$lib/components/SignInPrompt.svelte';
	import TopicStrip from '$lib/components/TopicStrip.svelte';
	import { forumConfig } from '$lib/config';
	import { listDiscussions } from '$lib/github/api';
	import { auth } from '$lib/github/auth.svelte';
	import type { DiscussionListItem, PageInfo } from '$lib/github/types';
	import { archiveMode, loadOverview, ui } from '$lib/ui.svelte';

	// the first page comes from the shared bootstrap query (ui.home);
	// "load more" pages accumulate locally
	let extra = $state<DiscussionListItem[]>([]);
	let extraPageInfo = $state<PageInfo | null>(null);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);

	// pinned posts render in their own section — keep them out of the feed
	const pinnedIds = $derived(new Set(ui.pinned.map((p) => p.id)));
	const discussions = $derived(
		[...(ui.home?.nodes ?? []), ...extra].filter((d) => !pinnedIds.has(d.id))
	);
	const pageInfo = $derived(extraPageInfo ?? ui.home?.pageInfo ?? null);
	const loading = $derived(ui.home === null);

	let started = false;
	$effect(() => {
		if ((auth.signedIn || (!auth.loading && archiveMode())) && !started) {
			started = true;
			// revalidates the shared feed when revisiting the home page
			loadOverview().catch((err) => {
				error = err instanceof Error ? err.message : 'Failed to load discussions.';
			});
		}
	});

	async function loadMore() {
		if (!pageInfo?.hasNextPage) return;
		loadingMore = true;
		try {
			const page = await listDiscussions({ after: pageInfo.endCursor });
			extra = [...extra, ...page.nodes];
			extraPageInfo = page.pageInfo;
		} finally {
			loadingMore = false;
		}
	}
</script>

<svelte:head>
	<title>{forumConfig.site.name} — Home</title>
</svelte:head>

{#if auth.loading}
	<Loading />
{:else if !auth.signedIn && !(archiveMode() && ui.bootedFromArchive)}
	<div class="mx-auto max-w-xl pt-8">
		<h1 class="mb-1.5 text-center text-2xl font-semibold tracking-[-0.02em]">{forumConfig.site.name}</h1>
		<p class="mb-8 text-center text-fd-muted-foreground">{forumConfig.site.description}</p>
		<SignInPrompt />
	</div>
{:else}
	<div class="mb-5">
		<h1 class="text-[22px] leading-tight font-semibold tracking-[-0.02em]">Latest discussions</h1>
		<p class="mt-1 text-[13.5px] text-fd-muted-foreground">{forumConfig.site.description}</p>
	</div>

	<TopicStrip categories={ui.categories} />

	<PinnedList discussions={ui.pinned} />

	{#if error && discussions.length === 0}
		<p class="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400">{error}</p>
	{:else if loading}
		<Loading />
	{:else if discussions.length === 0}
		<div class="panel px-6 py-14 text-center">
			<p class="font-medium">No discussions yet</p>
			<p class="mt-1 text-sm text-fd-muted-foreground">Be the first to start one.</p>
			<a href={resolve('/new')} class="btn btn-primary mt-4">New post</a>
		</div>
	{:else}
		{#if ui.pinned.length > 0}
			<h2 class="mb-2 text-[13px] font-medium text-fd-muted-foreground">Recent</h2>
		{/if}
		<ul class="panel divide-y divide-fd-border">
			{#each discussions as discussion (discussion.id)}
				<DiscussionRow {discussion} />
			{/each}
		</ul>
		{#if pageInfo?.hasNextPage}
			<div class="mt-5 flex justify-center">
				<button type="button" onclick={loadMore} disabled={loadingMore} class="btn btn-outline">
					{loadingMore ? 'Loading…' : 'Load more'}
				</button>
			</div>
		{/if}
	{/if}
{/if}
