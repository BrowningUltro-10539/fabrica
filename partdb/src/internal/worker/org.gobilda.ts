import * as cheerio from 'cheerio'
import * as he from 'he'

import type { ExternalFile, Keyword, Product } from '../types.ts'
import { sanitizeSKUSegment } from './helpers.ts'

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

export type GetProductData = {
  operation: 'org.gobilda.getProductData'
  input: {
    siteBuffer: ArrayBuffer
    keywords: Keyword[]
  }
  return: Product | null
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
  for (const li of $(root).find('li')) {
    // <li> only containing a single child means that it has maximum nesting
    if ($(li).children().length === 1) {
      console.log('li with one child found')
      const a = $(li).find('a:first')
      const href = a.attr('href')

      console.log(`href: ${href}`)

      // TODO more extensive filtering
      if (['bundle', 'see'].some((word) => href?.toLowerCase().includes(word)))
        continue
      if (href)
        result.push({
          pageUrl: href,
          keywords: matchKeywords(a.prop('textContent')?.trim() ?? '')
        })
    } else {
      console.log('li with not one child found')
      // <li> containing multiple children means that
      // the first element is <a>, while
      // the second element is another <ul> list.
      // However, matches for keywords need to propagate to the children.
      const a = $(li).find('a:first')
      console.log(`processing category ${a.prop('textContent')}`)
      const ul = $(li).find('ul:first')
      result.push(
        ...getPages($(ul), $).map((item) => {
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
    const $ = cheerio.load(new TextDecoder().decode(input.siteBuffer))
    const listRoot = $('div.body > div.container > ul :first')
    console.log(`List root length: ${listRoot.children().length}`)

    return getPages(listRoot, $)
  },
  'org.gobilda.getProductPages': (input: GetProductPages['input']) => {
    const $ = cheerio.load(new TextDecoder().decode(input.siteBuffer))
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
  },
  'org.gobilda.getProductData': ({
    siteBuffer,
    keywords
  }: GetProductData['input']) => {
    const $ = cheerio.load(new TextDecoder().decode(siteBuffer))
    const $strict = (...query: Parameters<cheerio.CheerioAPI>) => {
      const el = $(...query)
      if (el.length === 0)
        throw TypeError(
          `querySelector failed for query ${JSON.stringify(query)}`
        )
      return el
    }

    try {
      const name = he.decode($strict('meta[itemprop="name"]').prop('content'))
      const sku =
        `com.gobilda.${sanitizeSKUSegment($strict('meta[itemprop="sku"]').prop('content'))}` as `com.gobilda.${string}`
      const description = he.decode(
        $strict('meta[itemprop="description"]').prop('content')
      )
      // TODO add logic for adding more keywords
      const image = {
        type: 'external',
        url: new URL(
          $strict('meta[itemprop="image"]').prop('content')
        ).toString()
      } satisfies ExternalFile

      // for now i'll skip unpacking the STEP file.

      // Note for weight:
      // goBILDA usually puts weight in grams, but
      // sometimes include extra explanatory text.
      //
      // Therefore, we do some dumb logic,
      // extracting only the first numeric characters rather than
      // `parseInt`-ing the whole string.
      let weight = ''
      for (const char of [
        // oxlint-disable-next-line typescript/no-misused-spread
        ...$strict('meta[itemprop="weight"]').prop('content')
      ]) {
        if (
          !['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'].includes(
            char
          )
        )
          break
        weight += char
      }

      const additionalSpecs = Object.fromEntries(
        [...$('tr.product-specsTable-row')].map((el) => [
          `com.gobilda.${$(el).find('.product-specsTable-headerCell').prop('textContent')}`,
          $(el).find('product-specsTable-cell').prop('textContent')
        ])
      )

      return {
        name,
        sku,
        description,
        image,
        keywords,
        specifications: { weight: Number(weight), ...additionalSpecs }
      }
    } catch (e) {
      if (Error.isError(e)) return e
      throw e
    }
  }
}
