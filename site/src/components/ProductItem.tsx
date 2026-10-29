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
    <li class="shrink grow basis-114">
      <article
        class="flex w-full flex-col justify-start gap-4 rounded-3xl border border-fb-black/5 bg-fb-surface-light p-4 shadow-md xs:h-48 xs:flex-row dark:border-fb-white/5 dark:bg-fb-surface-dark"
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
        <div class="flex h-40 w-full flex-col items-start justify-between">
          <div class="flex w-full flex-col items-start justify-start">
            <h3 class="mb-0 line-clamp-1 overflow-hidden font-display text-xl font-bold text-ellipsis text-fb-text-primary-light dark:text-fb-text-primary-dark">
              {props.doc.name}
            </h3>
            <h4 class="mb-2 line-clamp-1 overflow-hidden font-mono text-xs text-fb-off-black dark:text-fb-off-white">
              {`Brand: ${brandEntry()?.name ?? 'Unknown'}, SKU: ${props.doc.sku.slice(Number(brandEntry()?.id.length) + 1)}`}
            </h4>
            <p class="line-clamp-2 overflow-hidden text-sm/4.5 text-ellipsis text-fb-text-secondary-light dark:text-fb-text-secondary-dark">
              {props.doc.description}
            </p>
          </div>
          <div class="flex w-full items-end justify-between">
            <a
              href={`/products/${props.doc.sku}`}
              class="rounded-full border border-fb-black/5 bg-fb-primary-light px-4 py-4 text-fb-white transition-colors hover:bg-fb-primary-dark hover:shadow-md dark:border-fb-white/5 dark:bg-fb-primary-dark dark:text-fb-black hover:dark:bg-fb-primary-light"
            >
              Learn more
            </a>
            <div class="hidden items-center justify-center gap-2 2xs:flex">
              <button class="flex h-14 w-14 items-center justify-center rounded-lg border border-fb-black/5 bg-fb-yellow text-fb-white transition-colors hover:bg-fb-light-yellow hover:shadow-md dark:border-fb-white/5 dark:bg-fb-light-yellow dark:text-fb-black hover:dark:bg-fb-yellow">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="2em"
                  height="2em"
                  viewBox="0 0 24 24"
                >
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.12 2.12 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.12 2.12 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.12 2.12 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.12 2.12 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.12 2.12 0 0 0 1.597-1.16z"
                  />
                </svg>
              </button>
              <button class="flex h-14 w-14 items-center justify-center rounded-lg border border-fb-black/5 bg-fb-red text-fb-white transition-colors hover:bg-fb-light-red hover:shadow-md dark:border-fb-white/5 dark:bg-fb-light-red dark:text-fb-black hover:dark:bg-fb-red">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="2em"
                  height="2em"
                  viewBox="0 0 24 24"
                >
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="m15 11l-1 9m5-9l-4-7M2 11h20M3.5 11l1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4M4.5 15.5h15M5 11l4-7m0 7l1 9"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </article>
    </li>
  )
}
