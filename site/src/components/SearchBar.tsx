// Currently, unplugin-icons isn't working with SolidJS+Vite: https://github.com/unplugin/unplugin-icons/issues/399
// import SearchIcon from '~icons/lucide/search?width=1em&height=1em'

import type { JSX } from 'solid-js/jsx-runtime'
import { isServer } from 'solid-js/web'

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
  return (
    <form
      method="get"
      class="max-w-300 w-full h-16 relative [view-transition-name:search-bar]"
      name="search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        if (props.interactivity) {
          if (typeof props.onSubmit === 'function') props.onSubmit(e)
        }
      }}
      action="/search"
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
        autofocus={props.interactivity?.autofocused}
        onInput={props.onInput}
        value={props.value ?? ''}
        class="peer rounded-4xl w-full h-full bg-fb-surface-light dark:bg-fb-surface-dark text-fb-text-secondary-light dark:text-fb-text-secondary-dark border-fb-black/5 dark:border-fb-white/5 border shadow-md pl-14 focus:pl-5 transition-all accent-fb-light-blue outline-0 [&::-webkit-search-cancel-button]:hidden"
      />
      {/* <SearchIcon /> */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="2em"
        height="2em"
        viewBox="0 0 24 24"
        class="text-fb-text-secondary-light dark:text-fb-text-secondary-dark absolute top-[calc(50%-1em)] left-4 peer-focus:opacity-0 transition-all"
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
  )
}
