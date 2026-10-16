<script lang="ts">
	import { theme, toggleTheme } from '$lib/theme.svelte';

	const dark = $derived(theme.current === 'dark');
</script>

<button
	type="button"
	onclick={toggleTheme}
	class="btn btn-quiet size-8 shrink-0 px-0"
	aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
	aria-pressed={dark}
	title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
>
	{#if dark}
		<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
		</svg>
	{:else}
		<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
		</svg>
	{/if}
</button>
