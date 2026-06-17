import * as cheerio from 'cheerio'

import type { Keyword } from '../types.ts'

export type GetCategoryPages = {
  operation: 'org.gobilda.getCategoryPages'
  input: {
    siteBuffer: ArrayBuffer
  }
  return: Array<{ pageUrl: string; keywords: Keyword[] }>
}

export type GetProductPages = {
  operation: 'org.gobilda.getProductPages'
  input: {
    siteBuffer: ArrayBuffer
  }
  return: string[]
}

const getPages = (
  root: ReturnType<cheerio.CheerioAPI>,
  $: cheerio.CheerioAPI
): Array<{ pageUrl: string; keywords: Keyword[] }> => {
  const exactMappings: Record<string, Keyword[]> = {
    'goRAIL®': ['extrusion'],
    'ServoBlocks®': ['mount']
  }

  // TODO improve logic & move out into helpers.ts
  const matchables: Keyword[] = [
    'motor',
    'servo',
    'actuator',
    'channel',
    'extrusion',
    'bearing',
    'shaft',
    'gear'
  ]

  const matchKeywords = (text: string): Keyword[] => [
    ...(exactMappings[text] ?? []),
    ...matchables.filter((word) => text.toLowerCase().includes(word))
  ]

  const result = []
  for (const li of root.children('li')) {
    // <li> only containing a single child means that it has maximum nesting
    if (li.children.length === 1) {
      const a = $(li).find('a:first')
      const href = a.attr('href') ?? ''

      // TODO more extensive filtering
      if (['bundle', 'see'].some((word) => href?.toLowerCase().includes(word)))
        continue
      result.push({
        pageUrl: href,
        keywords: matchKeywords(a.prop('textContent')?.trim() ?? '')
      })
    } else {
      // <li> containing multiple children means that
      // the first element is <a>, while
      // the second element is another <ul> list.
      // However, matches for keywords need to propagate to the children.
      const a = $(li).find('a:first')
      const ul = $(li).find('ul:first')
      result.push(
        ...getPages(ul, $).map((item) => {
          item.keywords.push(
            ...matchKeywords(a.prop('textContent')?.trim() ?? '')
          )
          return item
        })
      )
    }
  }

  // Clean up results so that there are no more
  // duplicate pages and keywords
  return result
    .reduce(
      (acc, val) => {
        const valIndex = acc
          .map((category) => category.pageUrl)
          .indexOf(val.pageUrl)

        if (valIndex === -1) {
          acc.push(val)
        } else {
          acc[valIndex].keywords = [
            ...new Set([...acc[valIndex].keywords, ...val.keywords])
          ]
        }

        return acc
      },
      [] as Array<{ pageUrl: string; keywords: Keyword[] }>
    )
    .filter(
      ({ pageUrl }) =>
        ![
          'bundle',
          'kit',
          'merch',
          'lubricant',
          'connector',
          'wire',
          'thread'
        ].some((word) => pageUrl.includes(word))
    )
}

export const handleMessage = {
  'org.gobilda.getCategoryPages': (input: GetCategoryPages['input']) => {
    const $ = cheerio.load(Buffer.from(input.siteBuffer))
    const listRoot = $('div.body > div.container > ul :first')

    return getPages(listRoot, $)
  },
  'org.gobilda.getProductPages': (input: GetProductPages['input']) => {
    const $ = cheerio.load(Buffer.from(input.siteBuffer))
    const links = $('li.product')
      .filter(
        (_, li) =>
          !$(li)
            .find('a')
            .prop('textContent')
            ?.toLowerCase()
            .startsWith('see also')
      )
      .map((_, li) => $(li).find('a').attr('href'))
      .toArray()
    return links
  }
}
