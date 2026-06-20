import cloudflare from '@astrojs/cloudflare'
import solidJs from '@astrojs/solid-js'
import tailwindcss from '@tailwindcss/vite'
// @ts-check
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
  integrations: [solidJs()],

  vite: {
    plugins: [tailwindcss()],

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
  }
})
