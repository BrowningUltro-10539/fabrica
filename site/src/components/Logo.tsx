import fabricaLogo from '../assets/fabrica.svg'
import fabricaLogoDarkMode from '../assets/fabrica_darkbkg.svg'

export default function Logo(props: { coerceToSmall: boolean }) {
  return (
    <picture class="flex h-full w-fit items-center justify-center pl-0.5 transition-all [view-transition-name:fabrica-logo]">
      <source
        srcset={fabricaLogoDarkMode.src}
        media="(prefers-color-scheme: dark)"
      />
      <img
        src={fabricaLogo.src}
        alt="fabrica logo"
        loading="eager"
        width={fabricaLogo.width}
        height={fabricaLogo.height}
        class="aspect-auto h-full w-full object-cover object-left transition-all"
        classList={{ 'max-sm:aspect-square': props.coerceToSmall }}
      />
    </picture>
  )
}
