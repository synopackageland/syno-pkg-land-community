<script lang="ts">
	import type { DiscussionListItem } from '$lib/github/types';
	import DiscussionRow from './DiscussionRow.svelte';

	let {
		discussions,
		showCategory = true
	}: { discussions: DiscussionListItem[]; showCategory?: boolean } = $props();
</script>

{#if discussions.length > 0}
	<section class="mb-6" aria-labelledby="pinned-heading">
		<h2 id="pinned-heading" class="mb-2 text-[13px] font-medium text-fd-muted-foreground">Pinned</h2>
		<ul class="panel divide-y divide-fd-border">
			{#each discussions as discussion (discussion.id)}
				<DiscussionRow {discussion} {showCategory} />
			{/each}
		</ul>
	</section>
{/if}
