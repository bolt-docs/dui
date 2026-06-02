import { defineConfig } from 'boltdocs'

export default defineConfig({
  base: '/docs',
  siteUrl: 'https://bdocs-dui.vercel.app',
  seo: {
    indexing: 'all',
  },
  theme: {
    title: 'DUI',
    description:
      'Terminal UI utilities — boxes, colors, logging, lists, dividers, and more.',
    codeTheme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    favicon: '/light.svg',
    logo: {
      dark: '/light.svg',
      light: '/dark.svg',
      alt: 'DUI Logo',
    },
    tabs: [
      { id: 'guides', text: 'Guides' },
      { id: 'api', text: 'API Reference' },
    ],
    editLink:
      'https://github.com/TU_USER/dui/edit/main/docs/docs/:path',
    githubRepo: 'TU_USER/dui',
  },
  robots: {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemaps: ['https://bdocs-dui.vercel.app/sitemap.xml'],
  },
})
