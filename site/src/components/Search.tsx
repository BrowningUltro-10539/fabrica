import { actions } from 'astro:actions'
import {
  For,
  createResource,
  createSignal,
  Suspense,
  createEffect
} from 'solid-js'

export default function Search() {
  let currentTimer: ReturnType<typeof setTimeout> | undefined
  let currentReject: (reason?: unknown) => void | undefined
  const getProducts = async (query: string) => {
    clearTimeout(currentTimer)
    currentReject?.()
    await new Promise((res, rej) => {
      currentTimer = setTimeout(res, 50)
      currentReject = rej
    })
    const { data, error } = await actions.search(query)
    if (error) throw error
    return data.filter((product) => !!product)
  }
  const [query, setQuery] = createSignal('')
  const [queryResult] = createResource(query, (query) => getProducts(query), {
    ssrLoadFrom: 'initial'
  })

  createEffect(() => {
    console.log(JSON.stringify(queryResult()))
  })
  return (
    <>
      <input type="text" onInput={(e) => setQuery(e.target.value)} />
      <ul>
        <Suspense fallback={<li>loading</li>}>
          <p>Results: {queryResult()?.length}</p>
          <For each={queryResult()}>
            {(doc) => (
              <li>
                <h3>{doc.name}</h3>
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
