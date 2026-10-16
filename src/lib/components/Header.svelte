<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { forumConfig } from '$lib/config';
	import { auth } from '$lib/github/auth.svelte';
	import { archiveMode, ui } from '$lib/ui.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	let query = $state('');

	function search(e: SubmitEvent) {
		e.preventDefault();
		if (query.trim()) goto(`${resolve('/search')}?q=${encodeURIComponent(query.trim())}`);
	}
</script>

<header class="sticky top-0 z-40 border-b border-fd-border bg-fd-background">
	<div class="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-5 sm:px-6">
		<a href={resolve('/')} class="flex shrink-0 items-center gap-2.5" aria-label="{forumConfig.site.name} home">
			<img src="/brand/icon-64.png" alt="" width="24" height="24" class="size-6" />
			<span class="hidden text-[14.5px] leading-none font-semibold tracking-[-0.01em] sm:inline">
				Syno Package Land <span class="font-normal text-fd-muted-foreground">Community</span>
			</span>
		</a>

		{#if forumConfig.nav.length > 0}
			<nav class="flex min-w-0 items-center gap-0.5 text-[13px]" aria-label="Site">
				{#each forumConfig.nav as link (link.href)}
					<a
						href={link.href}
						target={link.external ? '_blank' : undefined}
						rel={link.external ? 'noreferrer' : undefined}
						class="truncate rounded-md px-2 py-1.5 text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground"
					>
						{link.label}
					</a>
				{/each}
			</nav>
		{/if}

		<div class="flex-1"></div>

		{#if forumConfig.features.search && !archiveMode()}
		<form onsubmit={search} class="hidden w-60 lg:block" role="search">
			<div class="relative">
				<svg
					class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fd-muted-foreground"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
				</svg>
				<input
					type="search"
					bind:value={query}
					placeholder="Search forum…"
					aria-label="Search forum"
					class="field h-8 py-0 pl-8 text-[13px]"
				/>
			</div>
		</form>
		{/if}

		<div class="flex shrink-0 items-center gap-2">
			<ThemeToggle />
			{#if auth.loading}
				<div class="size-7 animate-pulse rounded-full bg-fd-muted"></div>
			{:else if auth.viewer}
				<a href={resolve('/new')} class="btn btn-primary hidden sm:inline-flex">
					<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
					New post
				</a>
				<details class="relative">
					<summary
						class="flex cursor-pointer list-none items-center rounded-full [&::-webkit-details-marker]:hidden"
						aria-label="Account menu"
					>
						<img
							src={auth.viewer.avatarUrl}
							alt={auth.viewer.login}
							class="size-7 rounded-full ring-1 ring-fd-border"
						/>
					</summary>
					<div
						class="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-lg border border-fd-border bg-fd-card p-1 shadow-float"
					>
						<a
							href={resolve('/u/[login]', { login: auth.viewer.login })}
							class="block rounded-md px-2.5 py-2 text-sm hover:bg-fd-muted"
						>
							<span class="block font-medium">{auth.viewer.name ?? auth.viewer.login}</span>
							<span class="block text-xs text-fd-muted-foreground">@{auth.viewer.login}</span>
						</a>
						<a href={resolve('/new')} class="block rounded-md px-2.5 py-2 text-sm hover:bg-fd-muted sm:hidden">
							New post
						</a>
						<button
							type="button"
							onclick={() => auth.signOut()}
							class="block w-full rounded-md px-2.5 py-2 text-left text-sm text-red-600 hover:bg-fd-muted dark:text-red-400"
						>
							Sign out
						</button>
					</div>
				</details>
			{:else}
				<button type="button" onclick={() => (ui.signInOpen = true)} class="btn btn-primary">
					Sign in
				</button>
			{/if}
		</div>
	</div>
</header>
