# Syno Package Land Community

One public repository hosts the forum source, Discussions and anonymous archive.
App implementation repositories remain private. Upstream: Discussion Kit
`1971c4352e490575811586718381779cc7c420dc` (GPL-3.0, LICENSE preserved).

## GitHub setup

All GitHub settings belong to **synopackageland**; sign in as that account
before changing them.

Discussion categories: **Announcements** (announcement format), **General**,
**Reclaim** (`reclaim`), **Connect** (`connect`), **Download Hub**
(`download-hub`) and **Third-party** (`third-party`), all open discussion
format except Announcements. Unused default categories are hidden in the
website. GitHub has no API for creating categories, so a new official package
needs its category created at
https://github.com/synopackageland/syno-pkg-land-community/discussions/categories ;
**Community maintenance** lists any missing category in its summary
(`pendingCategories`).

The repository Actions secret `CATALOG_SYNC_TOKEN` holds a fine-grained personal
access token named "syno-pkg-land-community catalog sync": resource owner
synopackageland, only `syno-pkg-land-community`, Discussions read/write and
Metadata read-only. It expires on **2027-10-16**.

### Renewing CATALOG_SYNC_TOKEN

Renew it about a month before it expires:

1. As synopackageland, open https://github.com/settings/personal-access-tokens ,
   open the token and choose **Regenerate token** (or create a new one with the
   same repository and permissions). Pick the longest expiration offered.
2. Open the repository's Settings → Secrets and variables → Actions and update
   `CATALOG_SYNC_TOKEN` with the new value. Do not paste it anywhere else.
3. Run **Community maintenance** from Actions and confirm the summary line shows
   `"mode":"write"`.
4. Update the expiry date in this file.

Catalog source is **synopackageland/catalog** (`catalog.yaml`), configured once
in `forum/catalog-settings.json`.

Every hour (minute 17), the job reads catalog.yaml and current discussions. It
deduplicates architecture pins, posts a new announcement per package/version and
updates generated notes for the same version. Third-party titles use
`[publisher/package]`. A stable hidden marker makes retries idempotent. Removing
an entry never deletes its category or discussions. Existing official display
names/slugs are configured; future names default to the SPK package ID.

If `CATALOG_SYNC_TOKEN` is not set, the job reports `needs-catalog-sync-token`
with pending announcements and still refreshes the anonymous archive using the
built-in repository GITHUB_TOKEN. An expired or revoked token makes the
catalog step fail, so a red **Community maintenance** run is the signal to renew it.
The long-lived token is never substituted with an unrelated workstation token.
All catalog writes verify `/user` is synopackageland before each mutation.

Snapshots keep normal Git history. Publishing creates a commit with the previous
data commit as parent and updates the ref with `force: false`; no force-push,
tag move, R2, KV, D1 or private App credentials are involved.

## OAuth

Sign-in uses the GitHub OAuth App **Syno Package Land Community**, owned by
synopackageland (https://github.com/settings/developers):

- Homepage: `https://community.synopkgland.com/`
- Callback: `https://community.synopkgland.com/auth/callback`
- The upstream flow requests `public_repo` (broader than forum-only
  permission). Visitor tokens belong to the visitor, never to the site owner.
  User tokens expire; the forum asks the visitor to sign in again.

`GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are secrets on the
synopkgland-community Worker only. To rotate the client secret, generate a new
one in the OAuth App, then set it through interactive stdin:

```sh
npx wrangler secret put GITHUB_CLIENT_SECRET
```

Never paste secrets into command arguments, files tracked by Git, issue
comments or logs. Both values are read at runtime; no rebuild is needed.
PAT sign-in is disabled.

## Cloudflare and deployment

The dedicated Worker serves static SPA assets plus `/api/auth/config`,
`/api/oauth/token`, `/api/health`, and `/package/<SPK ID>`. A direct package link
opens its native category and falls back to a package search on GitHub when
the category does not exist yet. Browser requests and the token exchange
use the same origin.

The Worker is served at the custom domain `community.synopkgland.com`
(Settings → Domains & Routes). The main website links to it through
`communityUrl` in the website repository's `website/src/data/public-origin.json`.
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
