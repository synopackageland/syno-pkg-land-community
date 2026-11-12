<script lang="ts">
	import { page } from '$app/state';
	import { forumConfig } from '$lib/config';
	import { newPostUrl } from '$lib/github/links';

	// Posts are written on GitHub; old /new links forward there with the topic kept.
	const target = $derived(newPostUrl(page.url.searchParams.get('topic')));
	$effect(() => location.replace(target));
</script>

<svelte:head>
	<title>New post — {forumConfig.site.name}</title>
</svelte:head>

<div class="panel px-6 py-14 text-center">
	<p class="font-medium">Posts are written on GitHub</p>
	<a href={target} class="btn btn-primary mt-4">Continue on GitHub</a>
</div>
