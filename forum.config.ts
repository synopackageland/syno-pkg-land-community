import { defineForumConfig } from './src/lib/config/schema';

export default defineForumConfig({
 site: { name: 'Syno Package Land Community', description: 'Package support, ideas and releases / 套件討論、建議與更新', footer: 'Powered by GitHub Discussions · Discussion Kit (GPL-3.0)' },
 repo: { owner: 'synopackageland', name: 'community' },
 nav: [{ label: '主網站 / Website', href: 'https://synopkgland.com/' }, { label: 'GitHub', href: 'https://github.com/synopackageland/community/discussions', external: true }],
 auth: { allowToken: false, oauth: { clientId: '', proxyUrl: '/api/oauth/token' } },
 admins: { logins: ['synopackageland'], badgeLabel: 'Maintainer' },
 badges: {},
 content: { sort: 'UPDATED_AT', articles: { enabled: false }, topics: { exclude: ['polls', 'ideas', 'q-a', 'show-and-tell'], restricted: ['announcements'] } },
 rep: { enabled: false },
 archive: { enabled: true },
 theme: {
  light: { background: '#f4f5f7', foreground: '#17212b', muted: '#f4f5f7', mutedForeground: '#46535f', card: '#ffffff', cardForeground: '#17212b', border: '#cdd2d9', primary: '#1f78e5', primaryForeground: '#ffffff', accent: '#e3eefc', accentForeground: '#135bb8', ring: '#1f78e5', link: '#135bb8' }
 }
});
