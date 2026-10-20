import { defineConfig } from 'vitepress';

const repo = 'https://github.com/loumalouomega/openscad-wasm';

export default defineConfig({
  title: 'OpenSCAD-WASM',
  description: 'OpenSCAD (CGAL + Manifold) compiled to WebAssembly for Node — evaluate .scad to .csg with no openscad binary',
  base: '/openscad-wasm/',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,
  head: [['meta', { name: 'theme-color', content: '#f9d72c' }]],
  themeConfig: {
    nav: [
      { text: 'Getting started', link: '/getting-started' },
      { text: 'Guide', link: '/guide/concepts' },
      { text: 'API', link: '/api/reference' },
      { text: 'Building', link: '/building' },
      { text: 'npm', link: 'https://www.npmjs.com/package/@loumalouomega/openscad-wasm' },
    ],
    sidebar: [
      { text: 'Introduction', items: [
        { text: 'Overview', link: '/' },
        { text: 'Getting started', link: '/getting-started' },
      ] },
      { text: 'Guide', items: [
        { text: 'Concepts', link: '/guide/concepts' },
        { text: 'Rendering', link: '/guide/rendering' },
        { text: 'Output formats', link: '/guide/formats' },
        { text: 'Libraries & fonts', link: '/guide/libraries-fonts' },
        { text: 'Customizer', link: '/guide/customizer' },
        { text: 'Workers & timeouts', link: '/guide/worker' },
        { text: 'Browser', link: '/guide/browser' },
        { text: 'Command line', link: '/guide/cli' },
        { text: 'Errors & aborts', link: '/guide/errors' },
        { text: 'TypeScript', link: '/guide/typescript' },
      ] },
      { text: 'API', items: [{ text: 'Reference', link: '/api/reference' }] },
      { text: 'Project', items: [
        { text: 'Building from source', link: '/building' },
        { text: 'Architecture', link: '/architecture' },
        { text: 'Probe results', link: '/probe-results' },
        { text: 'Troubleshooting', link: '/troubleshooting' },
        { text: 'Contributing', link: '/contributing' },
        { text: 'Licensing', link: '/licensing' },
      ] },
    ],
    socialLinks: [{ icon: 'github', link: repo }],
    search: { provider: 'local' },
    editLink: { pattern: `${repo}/edit/master/docs/:path`, text: 'Edit this page on GitHub' },
    footer: {
      message: 'Released under GPL-3.0-or-later. Not affiliated with the OpenSCAD authors.',
    },
  },
});
