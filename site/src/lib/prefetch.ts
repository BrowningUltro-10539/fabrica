import { isServer } from 'solid-js/web'

export const prefetch = isServer
  ? null
  : (await import('astro:prefetch')).prefetch
