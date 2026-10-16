<script lang="ts">
	import './layout.css';
	const favicon = '/favicon.ico';
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import SignInDialog from '$lib/components/SignInDialog.svelte';
	import { auth } from '$lib/github/auth.svelte';
	import { configIncomplete, forumConfig, themeCss } from '$lib/config';
	import { initTheme } from '$lib/theme.svelte';
	import { archiveMode, loadOverview, loadRep, ui } from '$lib/ui.svelte';

	let { children } = $props();

	$effect(() => initTheme());

	$effect(() => {
		if (configIncomplete) return;
		auth.configureOAuth();
		auth.init();
	});

	// forum data needs an authenticated GraphQL call; one combined query
	// bootstraps categories, permission, and the home feed. Signed-out
	// visitors boot from the read-only archive instead (when enabled), and a
	// later sign-in re-boots against the live API.
	$effect(() => {
		if (auth.signedIn && (!ui.categoriesLoaded || ui.bootedFromArchive)) {
			loadOverview();
		} else if (!auth.loading && archiveMode() && !ui.categoriesLoaded) {
			loadOverview();
		}
	});

	// rep ledger is public raw content — load as soon as the app boots
	$effect(() => {
		loadRep();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{forumConfig.site.name}</title>
	{#if themeCss}
		{@html `<style>${themeCss}</style>`}
	{/if}
</svelte:head>

{#if configIncomplete}
	<main class="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-3 px-4 text-center">
		<h1 class="text-2xl font-bold tracking-tight">Almost there…</h1>
		<p class="text-fd-muted-foreground">
			No repository is configured. Set <code class="rounded bg-fd-muted px-1.5 py-0.5 font-mono text-sm">repo.owner</code>
			and <code class="rounded bg-fd-muted px-1.5 py-0.5 font-mono text-sm">repo.name</code> in
			<code class="rounded bg-fd-muted px-1.5 py-0.5 font-mono text-sm">forum.config.ts</code>,
			or deploy with the included GitHub Actions workflow to auto-detect them.
		</p>
	</main>
{:else}
	<a
		href="#content"
		class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-fd-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-float"
	>
		Skip to content
	</a>
	<Header />
	<SignInDialog />

	{#if archiveMode() && ui.bootedFromArchive}
		<div class="border-b border-fd-border bg-fd-muted/60">
			<div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-0.5 px-4 py-1.5 text-[12.5px] text-fd-muted-foreground sm:px-6">
				<span>Read-only snapshot. Sign in to post, comment and react. / 唯讀快照，登入後可發文與回覆。</span>
				<button
					type="button"
					onclick={() => (ui.signInOpen = true)}
					class="font-medium text-fd-link hover:underline"
				>
					Sign in
				</button>
			</div>
		</div>
	{/if}

	<div class="mx-auto flex w-full max-w-6xl gap-10 px-4 sm:px-6">
		{#if ui.categories.length > 0}
			<aside class="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-48 shrink-0 overflow-y-auto py-8 md:block">
				<Sidebar categories={ui.categories} />
			</aside>
		{/if}
		<main id="content" class="min-w-0 flex-1 pt-6 pb-16 md:pt-8">
			{@render children()}
		</main>
	</div>

	{#if forumConfig.site.footer}
		<footer class="border-t border-fd-border">
			<div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-[12.5px] text-fd-muted-foreground sm:px-6">
				<span>{forumConfig.site.footer}</span>
				<nav class="flex gap-4" aria-label="Footer">
					{#each forumConfig.nav as link (link.href)}
						<a
							href={link.href}
							target={link.external ? '_blank' : undefined}
							rel={link.external ? 'noreferrer' : undefined}
							class="transition-colors hover:text-fd-foreground">{link.label}</a
						>
					{/each}
				</nav>
			</div>
		</footer>
	{/if}
{/if}
