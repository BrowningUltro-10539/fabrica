import solidJs from '@astrojs/solid-js'
import tailwindcss from '@tailwindcss/vite'
// @ts-check
import { defineConfig } from 'astro/config'

import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  integrations: [solidJs()],

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: netlify()
})