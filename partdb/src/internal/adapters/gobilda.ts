/**
 * The goBILDA site seems to be scrapable most easily by
 * looking at their sitemap,
 * finding each of the most nested pages, and
 * turning each of the products on each page into an appropriate entry.
 */
import { defineAdapter, getDocument, useFile } from '../helpers.ts'
import type { ExternalFile, Keyword } from '../types.ts'
import type { Product } from '../types.ts'

const GOBILDA_SITE = 'https://www.gobilda.com'

async function main(): Promise<Product[]> {
  const { document } = await getDocument(
    'https://www.gobilda.com/sitemap/categories',
    GOBILDA_SITE
  )

  const pages = getPages(
    document.querySelector('div.body > div.container > ul')!
  )
  const { name } = await useFile((file) =>
    file.writeFile(JSON.stringify(pages, null, 2))
  )
  const products: Product[] = []
  console.log(`Product pages written to ./dist/files/${name}`)
  await useFile(async (file) => {
    await file.writeFile('{\n')
    await Promise.all(
      pages.map(async ({ pageUrl, keywords }) => {
        const productPages = await parseCategoryPage(pageUrl)
        return await Promise.all(
          productPages.map(async (productPage) => {
            let product: Product | null = null
            try {
              product = await parseProductPage(productPage, keywords)
            } catch (e) {
              console.error(`Error for page ${productPage}: ${e}`)
            }
            if (global) global.gc?.()
            if (product) products.push(product)
          })
        )
      })
    )
    for (const product of products) {
      await file.writeFile(
        JSON.stringify(product, null, 2)
          .split('\n')
          .map((line) => line.padStart(2))
          .join('\n')
      )
    }
    await file.writeFile('}\n')
  })

  return products
}

function getPages(
  root: HTMLUListElement
): Array<{ pageUrl: string; keywords: Keyword[] }> {
  // if i was lazy i'd regex this

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
  for (const li of root.children) {
    // <li> only containing a single child means that it has maximum nesting
    if (li.children.length === 1) {
      const a = li.children[0] as HTMLAnchorElement

      // TODO more extensive filtering
      if (
        ['bundle', 'see'].some((word) =>
          a.textContent.toLowerCase().includes(word)
        )
      )
        continue
      result.push({
        pageUrl: a.href,
        keywords: matchKeywords(a.textContent.trim())
      })
    } else {
      // <li> containing multiple children means that
      // the first element is <a>, while
      // the second element is another <ul> list.
      // However, matches for keywords need to propagate to the children.
      const a = li.children[0] as HTMLAnchorElement
      result.push(
        ...getPages(li.children[1] as HTMLUListElement).map((item) => {
          item.keywords.push(...matchKeywords(a.textContent.trim()))
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
        // Remove duplicate keywords
        val.keywords = [...new Set(val.keywords)]

        const valIndex = acc
          .map((category) => category.pageUrl)
          .indexOf(val.pageUrl)

        if (valIndex === -1) {
          acc.push(val)
        } else {
          acc[valIndex].keywords.push()
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

const parsedCategoryPages: string[] = []

/**
 * Parse a category page
 * @param page Category page
 * @returns URLs to product pages
 */
async function parseCategoryPage(page: string): Promise<string[]> {
  console.log(`Doing category page ${page}`)
  const { document, finalSite } = await getDocument(page, GOBILDA_SITE)

  if (parsedCategoryPages.includes(finalSite)) {
    console.log(
      `Category page ${finalSite} (originally ${page}) already parsed!`
    )
    return []
  }
  parsedCategoryPages.push(finalSite)

  console.log(`Category page ${finalSite} retrieved! Getting links...`)
  const links = [...document.querySelectorAll('li.product')]
    // rudimentary filter for cards that redirect to another category page
    .filter(
      (li) =>
        !li.querySelector('a')?.textContent.toLowerCase().startsWith('see also')
    )
    .map((li) => li.querySelector('a')!.href)

  // const { name } = await useFile((file) =>
  //   file.writeFile(
  //     `// Links for category ${finalSite}\n${JSON.stringify(links, null, 2)}`
  //   )
  // )
  // console.log(
  //   `Links for category page ${finalSite} written to ./dist/files/${name}`
  // )
  return links
}

const parsedProductPages: string[] = []

/**
 * Parse a product page
 * @param productURL Product page
 * @returns Product data
 */
async function parseProductPage(
  productURL: string,
  keywords: Keyword[]
): Promise<Product | null> {
  console.log(`Doing product page ${productURL}`)
  const { document, finalSite } = await getDocument(productURL, GOBILDA_SITE)
  if (
    parsedProductPages.includes(finalSite) ||
    parsedCategoryPages.includes(finalSite)
  ) {
    console.log(
      `Product page ${finalSite} (originally ${productURL}) already parsed!`
    )
    return null
  }
  parsedProductPages.push(finalSite)

  const querySelectorStrict = (query: string): Element => {
    const node = document.querySelector(query)
    if (!node)
      throw Error(`querySelector failed for ${query} for product ${productURL}`)
    return node
  }

  const name = (querySelectorStrict('meta[itemprop="name"]') as HTMLMetaElement)
    .content
  const sku =
    `com.gobilda.${(querySelectorStrict('meta[itemprop="sku"]') as HTMLMetaElement).content}` as `com.gobilda.${string}`
  const description = (
    querySelectorStrict('meta[itemprop="description"]') as HTMLMetaElement
  ).content
  // TODO add logic for adding more keywords
  const image = {
    type: 'external',
    url: new URL(
      (querySelectorStrict('meta[itemprop="image"]') as HTMLMetaElement).content
    )
  } as ExternalFile

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
    ...(querySelectorStrict('meta[itemprop="weight"]') as HTMLMetaElement)
      .content
  ]) {
    if (!['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'].includes(char))
      break
    weight += char
  }

  const additionalSpecs = Object.fromEntries(
    [...document.querySelectorAll('tr.product-specsTable-row')].map((el) => [
      `com.gobilda.${el.children[0].textContent}`,
      el.children[1].textContent
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
}

const products = await main()

const { name } = await useFile((file) =>
  file.writeFile(JSON.stringify(products, null, 2))
)
console.log(`Final list written to ./dist/files/${name}`)
export default defineAdapter(products)
