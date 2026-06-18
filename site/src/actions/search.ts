import { z } from 'astro/zod'
import { defineAction } from 'astro:actions'
import { Document, Charset } from 'flexsearch'
import English from 'flexsearch/lang/en'
import { products } from 'partdb'
import type { Product } from 'partdb'

const document = new Document<Product>({
  tokenize: 'forward',
  encoder: Charset.LatinAdvanced,
  store: [
    {
      field: 'name'
    },
    {
      field: 'description',
      encoder: English
    }
  ],
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
    ]
  }
})
for (const product of products) {
  document.add(product)
}

export const search = defineAction({
  input: z.string(),
  handler: (input) => {
    const time = Date.now()
    const result = [
      ...new Set(document.search(input).flatMap((entry) => entry.result))
    ].map((sku) => products.find((product) => product.sku === sku))
    // .flatMap(({ result }) => products.find((product) => product.sku === id))
    console.log(Date.now() - time)
    return result
  }
})
