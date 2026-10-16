<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Category } from '$lib/github/types';
	import { allDiscussionsActive, sidebarGroups, topicVisual } from '$lib/nav';
	import Icon from './Icon.svelte';

	let { categories }: { categories: Category[] } = $props();

	const current = $derived(page.params.slug);
	const allActive = $derived(allDiscussionsActive(page.url.pathname, resolve('/')));
	const groups = $derived(sidebarGroups(categories));

	const base = 'flex items-center gap-2.5 truncate rounded-md px-2.5 py-[7px] transition-colors';
	const active = 'bg-fd-accent font-medium text-fd-accent-foreground';
	const idle = 'text-fd-muted-foreground hover:bg-fd-muted hover:text-fd-foreground';
</script>

<nav class="flex flex-col gap-6 text-[13.5px]" aria-label="Topics">
	{#each groups as group, i (group.label)}
		<div>
			<p class="mb-1.5 px-2.5 text-xs font-medium text-fd-muted-foreground">{group.label}</p>
			<div class="flex flex-col gap-0.5">
				{#if i === 0}
					<a href={resolve('/')} aria-current={allActive ? 'page' : undefined} class="{base} {allActive ? active : idle}">
						<Icon name="list" />
						All discussions
					</a>
				{/if}
				{#each group.items as category (category.id)}
					{@const visual = topicVisual(category.slug)}
					<a
						href={resolve('/t/[slug]', { slug: category.slug })}
						title={category.description ?? category.name}
						aria-current={current === category.slug ? 'page' : undefined}
						class="{base} {current === category.slug ? active : idle}"
					>
						<Icon name={visual.icon} class="size-4 {current === category.slug ? '' : visual.tint}" />
						{category.name}
					</a>
				{/each}
			</div>
		</div>
	{/each}
</nav>
