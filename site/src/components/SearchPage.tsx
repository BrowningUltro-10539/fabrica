import { actions } from 'astro:actions'
import type { Product } from 'partdb'
import {
  For,
  createResource,
  createSignal,
  Suspense,
  createEffect
} from 'solid-js'
import { isServer } from 'solid-js/web'

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
    initialValue: props.initialProducts ?? []
  })

  createEffect(() => {
    console.log(JSON.stringify(queryResult()))
  })

  return (
    <>
      <header class="fixed z-10 flex h-22 w-full flex-col items-center justify-start bg-linear-to-b from-fb-background-light/50 via-fb-background-light/20 to-fb-background-light/0 dark:from-fb-background-dark/70 dark:via-fb-background-dark/30 dark:to-fb-background-dark/0">
        <NoScriptBanner />

        <nav class="mr-2 ml-7 flex h-full w-content-width max-w-max-content-width items-center justify-center gap-4">
          <a
            href="/"
            class="flex h-16 min-w-fit items-center justify-center rounded-xl border border-fb-black/5 bg-fb-surface-light/90 p-3 shadow-md backdrop-blur-md transition-all dark:border-fb-white/5 dark:bg-fb-surface-dark/90"
          >
            <Logo coerceToSmall={true} />
          </a>
          <SearchBar
            placeholder="Search parts..."
            interactivity={{ autofocused: props.initialQuery === undefined }}
            onInput={(e) => setQuery(e.target.value)}
            onSubmit={() => refetch()}
            value={props.initialQuery}
          />
          <div></div>
        </nav>
      </header>
      <main class="flex flex-col items-center pt-22">
        <div class="flex w-content-width max-w-max-content-width flex-col items-start">
          <p
            class="mt-5 mb-3 ml-0.5 font-display text-3xl text-fb-text-primary-light dark:text-fb-text-primary-dark"
            role="status"
          >
            <span class="font-bold">Results:</span>{' '}
            <Suspense fallback={'loading...'}>{queryResult()?.length}</Suspense>
          </p>
          <Suspense fallback={<li>loading</li>}>
            <ol class="flex flex-wrap items-center gap-4">
              <For each={queryResult()}>
                {(doc, index) => <ProductItem doc={doc} index={index} />}
              </For>
            </ol>
          </Suspense>
        </div>
      </main>
    </>
  )
}
