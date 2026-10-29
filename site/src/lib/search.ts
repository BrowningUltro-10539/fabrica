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
export const init = () => products.forEach((product) => document.add(product))
export const searcher = (input: string): Product[] =>
  [...new Set(document.search(input).flatMap((entry) => entry.result))]
    .map((sku) => products.find((product) => product.sku === sku))
    .filter((product) => !!product)
