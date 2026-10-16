<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { swr } from '$lib/cache';
	import DiscussionRow from '$lib/components/DiscussionRow.svelte';
	import Loading from '$lib/components/Loading.svelte';
	import PinnedList from '$lib/components/PinnedList.svelte';
	import SignInPrompt from '$lib/components/SignInPrompt.svelte';
	import TopicStrip from '$lib/components/TopicStrip.svelte';
	import { forumConfig } from '$lib/config';
	import { isArticle, listDiscussions } from '$lib/github/api';
	import { auth } from '$lib/github/auth.svelte';
	import type { DiscussionListItem, PageInfo } from '$lib/github/types';
	import { archiveMode, postAction, repRequirement, ui } from '$lib/ui.svelte';

	const category = $derived(ui.categories.find((c) => c.slug === page.params.slug));

	let discussions = $state<DiscussionListItem[]>([]);
	let pageInfo = $state<PageInfo | null>(null);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);
	let filter = $state<'all' | 'posts' | 'articles'>('all');

	// pins for this topic render in their own section above the tabs
	const pinned = $derived(ui.pinned.filter((p) => p.category.slug === page.params.slug));
	const pinnedIds = $derived(new Set(pinned.map((p) => p.id)));

	const filtered = $derived(
		discussions
			.filter((d) => !pinnedIds.has(d.id))
			.filter((d) =>
				filter === 'all' ? true : filter === 'articles' ? isArticle(d.body) : !isArticle(d.body)
			)
	);

	let loadedFor: string | null = null;
	$effect(() => {
		if (category && loadedFor !== category.id) {
			loadedFor = category.id;
			load(category.id);
		}
	});

	async function load(categoryId: string) {
		loading = true;
		error = null;
		discussions = [];
		filter = 'all';
		// read-only archive mode: the whole feed is already in the archived
		// home index — filter it locally instead of calling the API
		if (archiveMode()) {
			discussions = (ui.home?.nodes ?? []).filter((d) => d.category.id === categoryId);
			pageInfo = null;
			loading = false;
			return;
		}
		try {
			await swr(`discussions:cat:${categoryId}`, () => listDiscussions({ categoryId }), (result) => {
				discussions = result.nodes;
				pageInfo = result.pageInfo;
				loading = false;
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load topic.';
		} finally {
			loading = false;
		}
	}

	async function loadMore() {
		if (!pageInfo?.hasNextPage || !category) return;
		loadingMore = true;
		try {
			const result = await listDiscussions({ categoryId: category.id, after: pageInfo.endCursor });
			discussions = [...discussions, ...result.nodes];
			pageInfo = result.pageInfo;
		} finally {
			loadingMore = false;
		}
	}

	const tabs = [
		{ id: 'all', label: 'All' },
		{ id: 'posts', label: 'Posts' },
		{ id: 'articles', label: 'Articles' }
	] as const;
</script>

<svelte:head>
	<title>{category ? `${category.name} — ${forumConfig.site.name}` : forumConfig.site.name}</title>
</svelte:head>

{#if auth.loading}
	<Loading />
{:else if !auth.signedIn && !(archiveMode() && ui.bootedFromArchive)}
	<SignInPrompt />
{:else if !ui.categoriesLoaded}
	<Loading />
{:else if !category}
	<div class="panel px-6 py-14 text-center">
		<p class="font-medium">Topic not found</p>
		<a href={resolve('/')} class="mt-2 inline-block text-sm text-fd-link hover:underline">
			Back to all discussions
		</a>
	</div>
{:else}
	<TopicStrip categories={ui.categories} current={category.slug} />

	<div class="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
		<div class="min-w-0">
			<p class="mb-1 text-[12.5px] text-fd-muted-foreground">
				<a href={resolve('/')} class="hover:text-fd-foreground">Forum</a>
				<span class="mx-1" aria-hidden="true">/</span>
				Topic
			</p>
			<h1 class="text-[22px] leading-tight font-semibold tracking-[-0.02em]">{category.name}</h1>
			{#if category.description}
				<p class="mt-1 text-[13.5px] text-fd-muted-foreground">{category.description}</p>
			{/if}
		</div>
		{#if postAction(category) === 'sign-in'}
			<button type="button" onclick={() => (ui.signInOpen = true)} class="btn btn-outline">
				Sign in to post
			</button>
		{:else if postAction(category) === 'post'}
			<a href="{resolve('/new')}?topic={category.slug}" class="btn btn-primary">
				<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
				New post
			</a>
		{:else}
			{@const restricted = forumConfig.content.topics.restricted.includes(category.slug)}
			<span
				class="inline-flex h-8 items-center gap-1.5 rounded-md bg-fd-muted px-3 text-[13px] text-fd-muted-foreground"
				title={restricted
					? 'Only repository maintainers can post in this topic'
					: `Posting here requires ${repRequirement(category.slug)} reputation`}
			>
				<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
				{restricted ? 'Maintainers only' : `Requires ${repRequirement(category.slug)} rep`}
			</span>
		{/if}
	</div>

	<PinnedList discussions={pinned} showCategory={false} />

	{#if forumConfig.content.articles.enabled}
	<div class="mb-4 flex w-fit gap-1 rounded-lg bg-fd-muted p-1 text-[13px]" role="tablist">
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				role="tab"
				aria-selected={filter === tab.id}
				onclick={() => (filter = tab.id)}
				class="rounded-md px-3 py-1 transition-colors {filter === tab.id
					? 'bg-fd-card font-medium text-fd-foreground'
					: 'text-fd-muted-foreground hover:text-fd-foreground'}"
			>
				{tab.label}
			</button>
		{/each}
	</div>
	{/if}

	{#if loading}
		<Loading />
	{:else if error}
		<p class="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400">{error}</p>
	{:else if filtered.length === 0}
		<div class="panel px-6 py-14 text-center">
			<p class="font-medium">Nothing here yet</p>
			<p class="mt-1 text-sm text-fd-muted-foreground">
				No {filter === 'all' ? 'discussions' : filter} in this topic.
			</p>
		</div>
	{:else}
		<ul class="panel divide-y divide-fd-border">
			{#each filtered as discussion (discussion.id)}
				<DiscussionRow {discussion} showCategory={false} />
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
