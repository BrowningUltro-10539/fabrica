import { z } from 'astro/zod'
import { defineAction } from 'astro:actions'
import { Document, Charset } from 'flexsearch'
import English from 'flexsearch/lang/en'
import { products } from 'partdb'
import type { Product } from 'partdb'

const document = new Document<Product>({
  tokenize: 'forward',
  encoder: Charset.LatinAdvanced,
  document: {
    id: 'sku',
    index: [
      {
        field: 'name'
      },
      {
        field: 'description',
        encoder: English
      }
    ],
    tag: [
      {
        field: 'keywords'
      },
      {
        field: 'specifications'
      }
    ],
    store: ['name', 'description']
  }
})

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
  handler: async (input) => {
    if (!committed) {
      for (const product of products) {
        document.add(product)
      }
      committed = true
    }
    const result = [
      ...new Set(document.search(input).flatMap((entry) => entry.result))
    ]
      .map((sku) => products.find((product) => product.sku === sku))
      .filter((product) => !!product)
    // await new Promise((res) => setTimeout(res, 2000))
    return result
  }
})
