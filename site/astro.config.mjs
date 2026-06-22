import cloudflare from '@astrojs/cloudflare'
import solidJs from '@astrojs/solid-js'
import tailwindcss from '@tailwindcss/vite'
import { fontProviders } from 'astro/config'
// @ts-check
import { defineConfig } from 'astro/config'
import Icons from 'unplugin-icons/vite'

// https://astro.build/config
export default defineConfig({
  integrations: [
    solidJs({
      include: ['~icons/**', '**.tsx']
    })
  ],

  vite: {
    plugins: [tailwindcss(), Icons({ compiler: 'solid' })],

    build: {
      minify: true
    },

    resolve: {
      // needed to resolve issue with tailwind integration pulling in vite v8
      // see [here](https://github.com/withastro/astro/issues/16542)
      tsconfigPaths: true
    }
  },

  adapter: cloudflare(),

  prefetch: true,

  image: {
    remotePatterns: [{ protocol: 'https' }]
  },

  fonts: [
    {
      name: 'DM Sans',
      provider: fontProviders.google(),
      cssVariable: '--font-dm-sans',
      styles: ['normal'],
      weights: [400, 700]
    },
    {
      name: 'IBM Plex Sans',
      provider: fontProviders.google(),
      cssVariable: '--font-ibm-plex-sans',
      styles: ['normal', 'italic'],
      weights: [400, 700]
    },
    {
      name: 'IBM Plex Mono',
      provider: fontProviders.google(),
      cssVariable: '--font-ibm-plex-mono',
      styles: ['normal'],
      weights: [400]
    }
  ]
})
