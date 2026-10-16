<script lang="ts">
	import { forumConfig } from '$lib/config';
	import { badgesFor, isAdmin, repFor } from '$lib/ui.svelte';

	let { login }: { login: string | undefined | null } = $props();

	const badges = $derived(login ? badgesFor(login) : []);
	const rep = $derived(repFor(login));
</script>

{#if login && isAdmin(login)}
	<span class="badge bg-fd-accent text-fd-accent-foreground">
		{forumConfig.admins.badgeLabel}
	</span>
{/if}
{#each badges as badge (badge)}
	<span class="badge bg-fd-muted text-fd-muted-foreground">
		{badge}
	</span>
{/each}
{#if rep !== null}
	<span
		class="badge bg-fd-muted text-fd-muted-foreground"
		title="Reputation earned on this forum"
	>
		{rep} rep
	</span>
{/if}
