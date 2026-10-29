import { z } from 'astro/zod'
import { defineAction } from 'astro:actions'

import { init, searcher } from '../lib/search'

// const { setTimeout, clearTimeout } = globalThis

// forgive me cloudflare for i have sinned 🥺

// globalThis.setTimeout = ((cb: Function) => {
//   void cb()
//   return 0
// }) as unknown as typeof setTimeout

// globalThis.clearTimeout = (() => undefined) as unknown as typeof clearTimeout

let committed = false

// globalThis.setTimeout = setTimeout
// globalThis.clearTimeout = clearTimeout

export const search = defineAction({
  input: z.string(),
  handler: (input) => {
    if (!committed) {
      init()
      committed = true
    }
    return searcher(input)
  }
})
