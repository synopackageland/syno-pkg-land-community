# Syno Package Land Community

One public repository hosts the forum source, Discussions and anonymous archive.
App implementation repositories remain private. Upstream: Discussion Kit
`1971c4352e490575811586718381779cc7c420dc` (GPL-3.0, LICENSE preserved).

## GitHub setup requiring the account owner

Sign in as **synopackageland** before changing repository settings.

1. Open https://github.com/synopackageland/community/discussions/categories.
2. Keep **Announcements** (announcement format) and **General** (open discussion).
3. Create **Reclaim**, **Download Hub**, **Connect**, and **Third-party** using
   open discussion format. Their generated slugs must be `reclaim`,
   `download-hub`, `connect`, `third-party`. Unused default categories are hidden
   in the website, so deleting them is unnecessary.
4. Create a fine-grained personal access token as synopackageland. Select only
   `community`, grant Discussions read/write, and leave unrelated permissions off.
   Store it as the repository Actions secret `CATALOG_SYNC_TOKEN`.
5. Run **Community maintenance** from Actions. Its summary lists any categories
   still requiring creation. No public API for creating categories exists in the
   GitHub GraphQL schema inspected on 2026-10-16; the automation does not pretend
   otherwise. Future new official packages appear in this pending list.

Catalog source is **synopackageland/catalog**, verified against the local catalog
remote and GitHub. The requested name `synopackageland/syno-pkg-land-catalog`
returned 404. The source is configured once in `forum/catalog-settings.json`.

Every hour (minute 17), the job reads catalog.yaml and current discussions. It
deduplicates architecture pins, posts a new announcement per package/version and
updates generated notes for the same version. Third-party titles use
`[publisher/package]`. A stable hidden marker makes retries idempotent. Removing
an entry never deletes its category or discussions. Existing official display
names/slugs are configured; future names default to the SPK package ID.

Without `CATALOG_SYNC_TOKEN`, the job reports pending announcements and still
refreshes the anonymous archive using the built-in repository GITHUB_TOKEN.
The long-lived token is never substituted with an unrelated workstation token.
All catalog writes verify `/user` is synopackageland before each mutation.

Snapshots keep normal Git history. Publishing creates a commit with the previous
data commit as parent and updates the ref with `force: false`; no force-push,
tag move, R2, KV, D1 or private App credentials are involved.

## OAuth setup requiring the account owner

Create a GitHub OAuth App at https://github.com/settings/developers:

- Homepage: `https://community.synopkgland.com/`
- Callback: `https://community.synopkgland.com/auth/callback`
- The existing upstream flow requests `public_repo` (broader than forum-only
  permission). Visitor tokens belong to the visitor, never to the site owner.

Set **only on the new synopkgland-community Worker**:

```sh
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

Use interactive stdin; never paste secrets into command arguments, files tracked
by Git, issue comments or logs. Both values are read at runtime; no rebuild is
needed after configuring them. Until then, visitors can read the archive and use
the direct GitHub Discussions link to post/reply. PAT sign-in is disabled.

## Cloudflare and deployment

The dedicated Worker serves static SPA assets plus `/api/auth/config`,
`/api/oauth/token`, `/api/health`, and `/package/<SPK ID>`. A direct package link
opens its native category when available and falls back to a package search on
GitHub while the category is pending. Browser requests and the token exchange
use the same origin.

If the custom domain is not already bound, the account owner must add
`community.synopkgland.com` under the Worker's Settings → Domains & Routes.
Do not change DNS records belonging to the existing website or package source.

```sh
npm ci
npm run check
npm run test:coverage
npm run build
npx wrangler deploy --dry-run
npx wrangler deploy
```

Run frontend build/test gates in the thread's kuma container. GitHub CI runs
the same checks separately. On this workstation, use the scoped
git-credential-synopackageland helper; the default gh account is different.
Never copy the existing site's .env. `.env.example` contains no credentials.

The first version uses one category per official App and a shared Third-party
category. Reassess multi-repository support near 15 official package categories;
it is deliberately not implemented now.
