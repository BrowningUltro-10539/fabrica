import type { Product } from 'partdb'
import { brands } from 'partdb'
import { createMemo } from 'solid-js'
import type { Accessor } from 'solid-js'

import { prefetch } from '../lib/prefetch'

export default function ProductItem(props: {
  doc: Product
  index: Accessor<number>
}) {
  // const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' })

  // const processDescription = (description: string) => {
  //   const sentences = segmenter.segment(description)
  //   const sentence = [...sentences][0].segment.trim()
  //   if (sentence.endsWith('.')) return sentence.slice(0, -1) + '…'
  //   return sentence + ' …'
  // }
  const brandEntry = createMemo(() =>
    brands.find((entry) => props.doc.sku.startsWith(entry.id))
  )
  return (
    <li class="shrink grow basis-100">
      <article
        class="relative flex h-48 w-full justify-start gap-4 rounded-3xl border border-fb-black/5 bg-fb-surface-light p-4 shadow-md dark:border-fb-white/5 dark:bg-fb-surface-dark"
        onMouseOver={() => prefetch?.(`/products/${props.doc.sku}`)}
      >
        {props.doc.image?.type === 'external' ? (
          <img
            src={props.doc.image.url}
            alt={`${props.doc.name} by ${brandEntry()?.name ?? 'Unknown'}`}
            class="aspect-square rounded-lg object-cover object-center shadow-md"
            loading={props.index() <= 6 ? 'eager' : 'lazy'}
          />
        ) : null}
        <div class="flex w-fit flex-col items-start justify-start">
          <h3 class="mb-0 line-clamp-1 overflow-hidden font-display text-xl font-bold text-ellipsis text-fb-text-primary-light dark:text-fb-text-primary-dark">
            {props.doc.name}
          </h3>
          <h4 class="mb-2 line-clamp-1 overflow-hidden font-mono text-xs text-fb-off-black dark:text-fb-off-white">
            {`Brand: ${brandEntry()?.name ?? 'Unknown'}, SKU: ${props.doc.sku.slice(Number(brandEntry()?.id.length) + 1)}`}
          </h4>
          <p class="line-clamp-3 overflow-hidden text-sm text-ellipsis text-fb-text-secondary-light dark:text-fb-text-secondary-dark">
            {props.doc.description}
          </p>
        </div>
        <a href={`/products/${props.doc.sku}`} class="absolute inset-0 hidden">
          Go to product
        </a>
      </article>
    </li>
  )
}
