import { SKUCharacters } from '../types.ts'

const sanitizeSegmenter = new Intl.Segmenter('en-US')
export function sanitizeSKUSegment(unsanitized: string): string {
  return [...sanitizeSegmenter.segment(unsanitized)].reduce(
    (acc, { segment }) => {
      if (SKUCharacters.includes(segment as (typeof SKUCharacters)[number]))
        return acc + segment
      return acc + '-'
    },
    '' as string
  )
}
