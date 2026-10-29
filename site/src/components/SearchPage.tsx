import {
  createWindowVirtualizer,
  measureElement
} from '@tanstack/solid-virtual'
import { actions } from 'astro:actions'
import type { Product } from 'partdb'
import {
  For,
  createResource,
  createSignal,
  Suspense,
  createEffect,
  onMount,
  startTransition
} from 'solid-js'
import type { Signal } from 'solid-js'
import { createStore, reconcile, unwrap } from 'solid-js/store'
import { isServer } from 'solid-js/web'
import { VList } from 'virtua/solid'

import Logo from './Logo'
import NoScriptBanner from './NoScriptBanner'
import ProductItem from './ProductItem'
import SearchBar from './SearchBar'

export default function SearchPage(props: {
  initialQuery?: string
  initialProducts?: Product[]
}) {
  const previousQueries: Map<string, Product[]> = new Map([['', []]])

  let currentTimer: ReturnType<typeof setTimeout> | undefined
  let currentReject: (reason?: unknown) => void | undefined
  const getProducts = async (query: string): Promise<Product[]> => {
    if (isServer) return props.initialProducts ?? []

    const cache = previousQueries.get(query)
    if (cache) return cache

    let products: Product[] | undefined
    clearTimeout(currentTimer)
    currentReject?.()
    await new Promise((res, rej) => {
      currentTimer = setTimeout(res, 50)
      currentReject = rej
    })
    const { data, error } = await actions.search(query)
    if (error) throw error
    products = data
    previousQueries.set(query, products)
    return products
  }
  const [query, setQuery] = createSignal(props.initialQuery ?? '')
  const [queryResult, { refetch }] = createResource(query, getProducts, {
    initialValue: props.initialProducts ?? [],
    storage(v) {
      const [store, setStore] = createStore({ value: v })
      return [
        () => store.value,
        (v) => {
          performance.mark('query-store-start')
          const unwrapped = unwrap(store.value)
          const value = typeof v === 'function' ? v(unwrapped ?? []) : unwrapped
          setStore('value', reconcile(value, { key: 'sku' }))
          performance.mark('query-store-end')
          performance.measure(
            'query-store',
            'query-store-start',
            'query-store-end'
          )
          return store.value
        }
      ] as Signal<Product[] | undefined>
    },
    ssrLoadFrom: 'initial'
  })

  const [pending, setPending] = createSignal(false)
  const updateQuery = async (newQuery: string) => {
    // this prevents the placeholder screen from activating
    // when navigating to an already fetched page.
    //
    // this *does* hit the Map twice for retrieving a read
    // (one here, one on the resource fetch), but
    // i don't think adding logic to
    // avoid the double lookup would be faster than
    // letting V8 handle it.
    if (!previousQueries.get(newQuery)) setPending(true)

    document.startViewTransition(async () => {
      console.log('Changing DOM...')
      performance.mark('dom-transition-start')
      await startTransition(() => setQuery(newQuery))
      console.log('DOM changed.')
      performance.mark('dom-transition-end')
      performance.measure(
        'dom-transition',
        'dom-transition-start',
        'dom-transition-end'
      )
      setPending(false)
    })
  }

  onMount(() =>
    createEffect(() => {
      window.localStorage.setItem('query', query())
      window.history.replaceState(
        null,
        '',
        `search${query() ? `?q=${query()}` : query()}`
      )
    })
  )

  const productVirtualizer = createWindowVirtualizer({
    get count() {
      return queryResult()?.length ?? 0
    },
    estimateSize: () => 632
  })

  return (
    <>
      <header class="fixed z-10 flex h-22 w-full flex-col items-center justify-start bg-linear-to-b from-fb-background-light/50 via-fb-background-light/20 to-fb-background-light/0 dark:from-fb-background-dark/70 dark:via-fb-background-dark/30 dark:to-fb-background-dark/0">
        <NoScriptBanner />

        <nav class="flex h-full w-content-width max-w-max-content-width items-center justify-center gap-4">
          <a
            href="/"
            class="flex h-16 w-18 items-center justify-center rounded-xl border border-fb-black/5 bg-fb-surface-light/90 p-3 shadow-md backdrop-blur-md transition-all sm:w-62 dark:border-fb-white/5 dark:bg-fb-surface-dark/90"
          >
            <Logo coerceToSmall={true} />
          </a>
          <SearchBar
            placeholder="Search parts..."
            interactivity={{ autofocused: props.initialQuery === undefined }}
            onInput={(e) => updateQuery(e.target.value)}
            onSubmit={() => refetch()}
            value={props.initialQuery}
          />
        </nav>
      </header>
      <main class="flex flex-col items-center pt-22">
        <div class="flex w-content-width max-w-max-content-width flex-col items-start">
          <p
            class="mt-5 mb-3 ml-0.5 font-display text-3xl text-fb-text-primary-light dark:text-fb-text-primary-dark"
            role="status"
          >
            <span class="font-bold">Results:</span>{' '}
            <Suspense>
              <span classList={{ 'blur-sm': pending() }}>
                {queryResult()?.length}
              </span>
            </Suspense>
          </p>
          <Suspense>
            <ol class="flex w-full flex-wrap items-center gap-4">
              <div
                class="relative w-full"
                style={{
                  height: `${productVirtualizer.getTotalSize()}`
                }}
              >
                <For each={productVirtualizer.getVirtualItems()}>
                  {(virtualItem, index) => (
                    <div
                      key={virtualItem.key}
                      ref={(el) => {
                        el.dataset.index = String(virtualItem.index)
                        productVirtualizer.measureElement(el)
                      }}
                      class="absolute top-0 left-0 w-full"
                      style={{
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`
                      }}
                    >
                      <ProductItem
                        doc={queryResult()[virtualItem.index]}
                        index={index}
                        loading={pending}
                      />
                    </div>
                  )}
                </For>
              </div>
            </ol>
          </Suspense>
        </div>
      </main>
    </>
  )
}
