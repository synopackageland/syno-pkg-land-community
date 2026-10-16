<script lang="ts">
	import { renderMarkdown } from '$lib/github/api';

	let {
		value = $bindable(''),
		placeholder = 'Write in Markdown…',
		rows = 6
	}: { value?: string; placeholder?: string; rows?: number } = $props();

	let tab = $state<'write' | 'preview'>('write');
	let previewHTML = $state('');
	let previewLoading = $state(false);

	async function showPreview() {
		tab = 'preview';
		if (!value.trim()) {
			previewHTML = '<p class="text-fd-muted-foreground">Nothing to preview.</p>';
			return;
		}
		previewLoading = true;
		try {
			previewHTML = await renderMarkdown(value);
		} catch {
			previewHTML = '<p class="text-red-600">Preview failed.</p>';
		} finally {
			previewLoading = false;
		}
	}
</script>

<div class="overflow-hidden rounded-lg border border-fd-border bg-fd-card transition-shadow focus-within:border-fd-ring focus-within:ring-3 focus-within:ring-fd-ring/20">
	<div class="flex gap-1 border-b border-fd-border px-1.5 pt-1.5 text-[13px]">
		<button
			type="button"
			onclick={() => (tab = 'write')}
			class="-mb-px border-b-2 px-3 py-1.5 transition-colors {tab === 'write'
				? 'border-fd-foreground font-medium text-fd-foreground'
				: 'border-transparent text-fd-muted-foreground hover:text-fd-foreground'}"
		>
			Write
		</button>
		<button
			type="button"
			onclick={showPreview}
			class="-mb-px border-b-2 px-3 py-1.5 transition-colors {tab === 'preview'
				? 'border-fd-foreground font-medium text-fd-foreground'
				: 'border-transparent text-fd-muted-foreground hover:text-fd-foreground'}"
		>
			Preview
		</button>
	</div>

	{#if tab === 'write'}
		<textarea
			bind:value
			{placeholder}
			{rows}
			class="block w-full resize-y bg-transparent p-3 text-sm leading-relaxed outline-none placeholder:text-fd-muted-foreground"
			aria-label={placeholder}
		></textarea>
	{:else}
		<div class="markdown min-h-24 p-3">
			{#if previewLoading}
				<p class="text-sm text-fd-muted-foreground">Rendering…</p>
			{:else}
				{@html previewHTML}
			{/if}
		</div>
	{/if}
</div>
