import { defineForumConfig } from './src/lib/config/schema';

export default defineForumConfig({
 site: { name: 'Syno Package Land Community', description: 'Package support, ideas and releases / 套件討論、建議與更新', footer: 'Powered by GitHub Discussions · Discussion Kit (GPL-3.0)' },
 repo: { owner: 'synopackageland', name: 'syno-pkg-land-community' },
 nav: [{ label: '主網站 / Website', href: 'https://synopkgland.com/' }, { label: 'GitHub', href: 'https://github.com/synopackageland/syno-pkg-land-community/discussions', external: true }],
 auth: { allowToken: false, oauth: { clientId: '', proxyUrl: '/api/oauth/token' } },
 admins: { logins: ['synopackageland'], badgeLabel: 'Maintainer' },
 badges: {},
 content: { sort: 'UPDATED_AT', articles: { enabled: false }, topics: { exclude: ['polls', 'ideas', 'q-a', 'show-and-tell'], restricted: ['announcements'] } },
 rep: { enabled: false },
 archive: { enabled: true }
});
