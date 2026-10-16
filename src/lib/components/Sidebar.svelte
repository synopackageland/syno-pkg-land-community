<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Category } from '$lib/github/types';

	let { categories }: { categories: Category[] } = $props();

	const current = $derived(page.params.slug);
	const allActive = $derived(!current && !page.url.pathname.endsWith('/search'));
</script>

<nav class="flex flex-col gap-px text-[13.5px]" aria-label="Topics">
	<p class="mb-2 px-2.5 text-xs font-medium text-fd-muted-foreground">Topics</p>
	<a
		href={resolve('/')}
		aria-current={allActive ? 'page' : undefined}
		class="rounded-md px-2.5 py-1.5 transition-colors {allActive
			? 'bg-fd-accent font-medium text-fd-accent-foreground'
			: 'text-fd-muted-foreground hover:bg-fd-muted hover:text-fd-foreground'}"
	>
		All discussions
	</a>
	{#each categories as category (category.id)}
		<a
			href={resolve('/t/[slug]', { slug: category.slug })}
			title={category.description ?? category.name}
			aria-current={current === category.slug ? 'page' : undefined}
			class="truncate rounded-md px-2.5 py-1.5 transition-colors {current === category.slug
				? 'bg-fd-accent font-medium text-fd-accent-foreground'
				: 'text-fd-muted-foreground hover:bg-fd-muted hover:text-fd-foreground'}"
		>
			{category.name}
		</a>
	{/each}
</nav>
