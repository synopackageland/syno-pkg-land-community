<script lang="ts">
	import { toggleReaction } from '$lib/github/api';
	import { auth } from '$lib/github/auth.svelte';
	import type { ReactionContent, ReactionGroup } from '$lib/github/types';
	import { ui } from '$lib/ui.svelte';

	let { subjectId, groups }: { subjectId: string; groups: ReactionGroup[] } = $props();

	const EMOJI: Record<ReactionContent, string> = {
		THUMBS_UP: '👍',
		THUMBS_DOWN: '👎',
		LAUGH: '😄',
		HOORAY: '🎉',
		CONFUSED: '😕',
		HEART: '❤️',
		ROCKET: '🚀',
		EYES: '👀'
	};

	// writable derived: reset from props, reassigned for optimistic updates
	let local = $derived(groups.map((g) => ({ ...g, reactors: { ...g.reactors } })));

	let pickerOpen = $state(false);

	const active = $derived(local.filter((g) => g.reactors.totalCount > 0));

	async function toggle(content: ReactionContent) {
		if (!auth.signedIn) {
			ui.signInOpen = true;
			return;
		}
		pickerOpen = false;
		const group = local.find((g) => g.content === content);
		if (!group) return;
		const on = !group.viewerHasReacted;
		const apply = (groups: typeof local, delta: number, reacted: boolean) =>
			groups.map((g) =>
				g.content === content
					? { ...g, viewerHasReacted: reacted, reactors: { totalCount: g.reactors.totalCount + delta } }
					: g
			);
		local = apply(local, on ? 1 : -1, on);
		try {
			await toggleReaction(subjectId, content, on);
		} catch {
			local = apply(local, on ? -1 : 1, !on);
		}
	}
</script>

<div class="relative flex flex-wrap items-center gap-1.5">
	{#each active as group (group.content)}
		<button
			type="button"
			onclick={() => toggle(group.content)}
			aria-pressed={group.viewerHasReacted}
			class="tabular inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs transition-colors {group.viewerHasReacted
				? 'border-fd-ring/50 bg-fd-accent font-medium text-fd-accent-foreground'
				: 'border-fd-border hover:bg-fd-muted'}"
		>
			<span>{EMOJI[group.content]}</span>
			{group.reactors.totalCount}
		</button>
	{/each}

	<button
		type="button"
		onclick={() => (pickerOpen = !pickerOpen)}
		class="inline-flex size-7 items-center justify-center rounded-full border border-fd-border text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground"
		aria-expanded={pickerOpen}
		aria-label="Add reaction"
	>
		<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></svg>
	</button>

	{#if pickerOpen}
		<div
			class="absolute bottom-full left-0 z-30 mb-2 flex gap-0.5 rounded-lg border border-fd-border bg-fd-card p-1 shadow-float"
		>
			{#each Object.entries(EMOJI) as [content, emoji] (content)}
				<button
					type="button"
					onclick={() => toggle(content as ReactionContent)}
					class="rounded-md p-1 text-base transition-colors hover:bg-fd-muted"
					aria-label={content.toLowerCase().replace('_', ' ')}
				>
					{emoji}
				</button>
			{/each}
		</div>
	{/if}
</div>
