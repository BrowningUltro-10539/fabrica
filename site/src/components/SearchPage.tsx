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

import { prefetch } from '../lib/prefetch'
import SearchBar from './SearchBar'

export default function SearchPage(props: {
  initialQuery?: string
  initialProducts?: Product[]
}) {
  const previousQueries: Map<string, Product[]> = new Map([['', []]])

  let currentTimer: ReturnType<typeof setTimeout> | undefined
  let currentReject: (reason?: unknown) => void | undefined
  const getProducts = async (query: string): Promise<Product[]> => {
    const cache = previousQueries.get(query)
    if (cache) return cache

    let products: Product[] | undefined
    if (!isServer) {
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
    if (props.initialProducts) return props.initialProducts
    throw Error('ssr is wonky')
  }
  const [query, setQuery] = createSignal(props.initialQuery ?? '')
  const [queryResult, { refetch }] = createResource(query, getProducts, {
    initialValue: props.initialProducts
  })

  createEffect(() => {
    console.log(JSON.stringify(queryResult()))
  })

  return (
    <>
      <SearchBar
        placeholder="Search parts..."
        interactivity={{ autofocused: props.initialQuery === undefined }}
        onInput={(e) => setQuery(e.target.value)}
        onSubmit={() => refetch()}
        value={props.initialQuery}
      />
      <ul>
        <Suspense fallback={<li>loading</li>}>
          <p>Results: {queryResult()?.length}</p>
          <For each={queryResult()}>
            {(doc) => (
              <li>
                <h3>
                  <a
                    href={`/products/${doc.sku}`}
                    onMouseOver={() => prefetch?.(`/products/${doc.sku}`)}
                  >
                    {doc.name}
                  </a>
                </h3>
                <p>{doc.description}</p>
                {doc.image?.type === 'external' ? (
                  <img src={doc.image.url} alt="thing" height={100} />
                ) : null}
              </li>
            )}
          </For>
        </Suspense>
      </ul>
    </>
  )
}
