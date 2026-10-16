<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Category } from '$lib/github/types';
	import { topicVisual } from '$lib/nav';
	import Icon from './Icon.svelte';

	// Topic navigation for narrow screens, where the sidebar is hidden.
	let { categories, current = null }: { categories: Category[]; current?: string | null } = $props();
</script>

{#if categories.length > 0}
	<nav class="-mx-4 mb-6 overflow-x-auto px-4 sm:-mx-6 sm:px-6 md:hidden" aria-label="Topics">
		<ul class="flex w-max gap-1.5 text-[13px]">
			<li>
				<a
					href={resolve('/')}
					aria-current={current === null ? 'page' : undefined}
					class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors {current === null
						? 'border-transparent bg-fd-foreground text-fd-background'
						: 'border-fd-border bg-fd-card text-fd-muted-foreground hover:text-fd-foreground'}"
				>
					<Icon name="list" class="size-3.5" />
					All
				</a>
			</li>
			{#each categories as category (category.id)}
				{@const visual = topicVisual(category.slug)}
				<li>
					<a
						href={resolve('/t/[slug]', { slug: category.slug })}
						aria-current={current === category.slug ? 'page' : undefined}
						class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 whitespace-nowrap transition-colors {current === category.slug
							? 'border-transparent bg-fd-foreground text-fd-background'
							: 'border-fd-border bg-fd-card text-fd-muted-foreground hover:text-fd-foreground'}"
					>
						<Icon name={visual.icon} class="size-3.5 {current === category.slug ? '' : visual.tint}" />
						{category.name}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}
