import fabricaLogo from '../assets/fabrica.svg'
import fabricaLogoDarkMode from '../assets/fabrica_darkbkg.svg'

export default function Logo() {
  return (
    <picture class="h-full w-auto px-6 [view-transition-name:fabrica-logo]">
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
        class="h-full w-full object-cover py-4"
      />
    </picture>
  )
}
