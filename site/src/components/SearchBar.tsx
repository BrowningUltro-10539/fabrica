// Currently, unplugin-icons isn't working with SolidJS+Vite: https://github.com/unplugin/unplugin-icons/issues/399
// import SearchIcon from '~icons/lucide/search?width=1em&height=1em'

import { createSignal, onMount } from 'solid-js'
import type { JSX } from 'solid-js/jsx-runtime'
import { isServer, Match, Switch } from 'solid-js/web'

import { prefetch } from '../lib/prefetch'

export default function SearchBar(props: {
  placeholder?: string
  onInput?: JSX.InputEventHandlerUnion<HTMLInputElement, InputEvent>
  onSubmit?: JSX.EventHandlerUnion<
    HTMLFormElement,
    SubmitEvent,
    JSX.EventHandler<HTMLFormElement, SubmitEvent>
  >
  /**
   * If set to null, the search bar will redirect instead to /search.
   */
  interactivity: null | { autofocused: boolean }
  value?: string
}) {
  const [hydrated, setHydrated] = createSignal(false)
  onMount(() => setHydrated(true))
  return (
    <Switch>
      <Match when={!!props.interactivity || !hydrated()}>
        <form
          method="get"
          class="relative h-16 w-full max-w-max-content-width min-w-44 rounded-full backdrop-blur-md transition-all"
          name="search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            if (props.interactivity) {
              if (typeof props.onSubmit === 'function') props.onSubmit(e)
            }
          }}
          action="/search?noJs=true"
          autocomplete="on"
        >
          <input
            name="q"
            type="search"
            placeholder={props.placeholder}
            onFocus={
              props.interactivity || isServer
                ? undefined
                : () => location.assign('/search')
            }
            onPointerEnter={
              props.interactivity || isServer
                ? undefined
                : (e) => e.pointerType === 'mouse' && prefetch?.('/search')
            }
            autofocus={props.interactivity?.autofocused}
            onInput={props.onInput}
            value={props.value ?? ''}
            class="peer h-full w-full rounded-full border border-fb-black/5 bg-fb-surface-light/70 pl-14 text-fb-text-secondary-light accent-fb-light-blue shadow-md outline-0 transition-all [view-transition-name:search-bar] placeholder:text-fb-light-gray focus:pl-5 dark:border-fb-white/5 dark:bg-fb-surface-dark/70 dark:text-fb-text-secondary-dark dark:placeholder:text-fb-medium-gray [&::-webkit-search-cancel-button]:hidden"
          />
          {/* <SearchIcon /> */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="2em"
            height="2em"
            viewBox="0 0 24 24"
            class="absolute top-[calc(50%-1em)] left-4 text-fb-text-secondary-light transition-all [view-transition-name:search-bar-icon] peer-focus:opacity-0 dark:text-fb-text-secondary-dark"
          >
            <path d="M0 0h24v24H0z" fill="none" />
            <g
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            >
              <path d="m21 21l-4.34-4.34" />
              <circle cx="11" cy="11" r="8" />
            </g>
          </svg>
        </form>
      </Match>
      <Match when={!props.interactivity && hydrated()}>
        <a
          type="search"
          href="/search"
          onFocus={
            props.interactivity || isServer
              ? undefined
              : () => location.assign('/search')
          }
          onPointerEnter={
            props.interactivity || isServer
              ? undefined
              : (e) => e.pointerType === 'mouse' && prefetch?.('/search')
          }
          autofocus={props.interactivity?.autofocused}
          class="flex h-16 w-full max-w-max-content-width cursor-text items-center rounded-full border border-fb-black/5 bg-fb-surface-light/70 pl-14 text-fb-light-gray shadow-md outline-0 backdrop-blur-md transition-all [view-transition-name:search-bar] dark:border-fb-white/5 dark:bg-fb-surface-dark/70 dark:text-fb-medium-gray"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="2em"
            height="2em"
            viewBox="0 0 24 24"
            class="absolute top-[calc(50%-1em)] left-4 text-fb-text-secondary-light transition-all [view-transition-name:search-bar-icon] dark:text-fb-text-secondary-dark"
          >
            <path d="M0 0h24v24H0z" fill="none" />
            <g
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            >
              <path d="m21 21l-4.34-4.34" />
              <circle cx="11" cy="11" r="8" />
            </g>
          </svg>
          <p>{props.placeholder}</p>
        </a>
        {/* <SearchIcon /> */}
      </Match>
    </Switch>
  )
}
