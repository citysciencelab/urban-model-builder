// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import { themes as prismThemes } from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Urban Model Builder',
  tagline: 'Dokumentation und Tutorials',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://citysciencelab.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: 'urban-model-builder',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'citysciencelab', // Usually your GitHub org/user name.
  projectName: 'urban-model-builder', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'de',
    locales: ['de', 'en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',

        },
        /*blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },*/
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'Urban Model Builder',
        logo: {
          alt: 'Urban Model Builder Logo',
          src: 'img/ModelBuilder_Logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'documentationSidebar',
            position: 'left',
            label: 'Dokumentation',
          },
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Tutorials',
          },
           {
            type: 'docSidebar',
            sidebarId: 'cheatsheetSidebar',
            position: 'left',
            label: 'Cheatsheet',
          },
          //{to: '/blog', label: 'Blog', position: 'left'},
          {
            type: 'localeDropdown',
            position: 'right',
          },
          {
            href: 'https://github.com/citysciencelab/urban-model-builder',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'light',
        links: [
          {
            title: 'Übersicht',
            items: [
              {
                label: 'Dokumentation',
                to: '/docs/documentation/intro',
              },
              {
                label: 'Tutorial',
                to: '/docs/tutorials/tutorial1',
              },
            ],
          },

          {
            title: 'Weiterführende Links',
            items: [
              {
                label: 'Connected Urban Twins',
                href: 'https://connectedurbantwins.de',
              },
              {
                label: 'City Science Lab',
                href: 'https://citysciencelab.hamburg',
              },
              {
                label: "Built on Insight Maker's Open Source Simulation Library",
                href: 'https://github.com/scottfr/simulation',
              },
            ],
          },
          {
            title: 'Gefördert durch',
            items: [
              {
                html: `
                  <div style="display: flex; align-items: left;">
                    <img src="/img/__CUT_Förderlogos.svg" alt="Förderlogo" style="height: 100px;" />
                  </div>
                `,
              },
            ],
          },
        ],
        logo: {
          alt: 'City Science Lab Logo',
          src: 'img/CSL_Logo.png',
          href: 'https://citysciencelab.hamburg',
          width: 300
        },
        copyright: `Copyright © ${new Date().getFullYear()} City Science Lab at HafenCity University Hamburg. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
