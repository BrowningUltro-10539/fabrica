import fabricaLogo from '../assets/fabrica.svg'
import fabricaLogoDarkMode from '../assets/fabrica_darkbkg.svg'
import fabricaLogoSquare from '../assets/fabrica_icon.svg'

export default function Logo(props: { coerceToSmall: boolean }) {
  return (
    <picture class="flex h-full w-full items-center justify-center [view-transition-name:fabrica-logo]">
      {props.coerceToSmall && (
        <source
          srcset={fabricaLogoSquare.src}
          media="(width < 40rem)"
          class="h-full w-auto"
        />
      )}
      <source
        srcset={fabricaLogoDarkMode.src}
        media="(prefers-color-scheme: dark)"
        class="h-full w-auto"
      />
      <img
        src={fabricaLogo.src}
        alt="fabrica logo"
        loading="eager"
        class="h-full w-auto"
      />
    </picture>
  )
}
