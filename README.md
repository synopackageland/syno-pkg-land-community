# Syno Package Land Community

Package support, feature ideas and release announcements for Syno Package Land.

- Website: https://synopkgland.com/
- Forum: https://community.synopkgland.com/
- GitHub Discussions: https://github.com/synopackageland/community/discussions

The forum is based on [Discussion Kit](https://github.com/NotReeceHarris/discussion-kit),
upstream commit `1971c4352e490575811586718381779cc7c420dc`, GPL-3.0.
See [operations and remaining account setup](docs/OPERATIONS.md) for deployment,
OAuth, category creation, catalog automation and anonymous snapshots.

Read the forum without an account. Use GitHub to participate; the website's
OAuth button becomes available when the owner configures its dedicated OAuth App.
Third-party discussions use `[publisher/package]` in their titles.

```sh
npm ci
npm run dev
npm run check
npm run test:coverage
npm run build
```

The main website and forum share brand colors and public assets while retaining
the upstream forum layout. App source repositories remain private.
