import crypto from 'node:crypto'

/**
 * The goBILDA site seems to be scrapable most easily by
 * looking at their sitemap,
 * finding each of the most nested pages, and
 * turning each of the products on each page into an appropriate entry.
 */
import {
  defineAdapter,
  getDocument,
  useFile,
  useCache,
  getFinalSite,
  createThrottled
} from '../helpers.ts'
import type { ExternalFile, Keyword, Product } from '../types.ts'
import workerPool from '../worker-pool.ts'
import type { GetCategoryPages } from '../worker/gobilda.ts'

const GOBILDA_SITE = 'https://www.gobilda.com'
const MIN_WAIT_MS = 100

const rateLimitedFetch: typeof fetch = createThrottled(fetch, MIN_WAIT_MS)

async function main(): Promise<Product[]> {
  const sitemapPagesKey = 'pages from goBILDA sitemap'

  const pages: Array<{ pageUrl: string; keywords: Keyword[] }> = await useCache(
    sitemapPagesKey,
    async () => {
      // const { document } = await getDocument(
      //   'https://www.gobilda.com/sitemap/categories',
      //   GOBILDA_SITE
      // )
      // return getPages(document.querySelector('div.body > div.container > ul')!)
      const { finalSiteBuffer } = await getFinalSite(
        'https://www.gobilda.com/sitemap/categories',
        GOBILDA_SITE,
        rateLimitedFetch
      )

      return workerPool.sendTask<GetCategoryPages>(
        {
          operation: 'org.gobilda.getCategoryPages',
          input: {
            siteBuffer: finalSiteBuffer
          }
        },
        [finalSiteBuffer]
      )
    },
    { lifetime: Temporal.Duration.from({ hours: 7 * 24 }) }
  )
  console.log(
    `Product pages written to ./cache/${crypto.createHash('sha256').update(sitemapPagesKey).digest('base64url')}`
  )

  const products: Product[] = []

  await Promise.all(
    pages.map(async ({ pageUrl, keywords }) => {
      const productPages = await parseCategoryPage(pageUrl)
      if (global) global.gc?.()
      return await Promise.all(
        productPages.map(async (productPage) => {
          let product: Product | null = null
          try {
            product = await parseProductPage(productPage, keywords)
          } catch (e) {
            console.error(
              `Error for page ${productPage}: ${(e as Error).message}`
            )
          }
          if (global) global.gc?.()
          if (product) products.push(product)
        })
      )
    })
  )

  return products
}

const parsedCategoryPages: string[] = []

/**
 * Parse a category page
 * @param page Category page
 * @returns URLs to product pages
 */
async function parseCategoryPage(page: string): Promise<string[]> {
  console.log(`Doing category page ${page}`)
  const { document, finalSite } = await getDocument(
    page,
    GOBILDA_SITE,
    rateLimitedFetch
  )

  if (parsedCategoryPages.includes(finalSite)) {
    console.log(
      `Category page ${finalSite} (originally ${page}) already parsed!`
    )
    return []
  }
  parsedCategoryPages.push(finalSite)
  console.log(`Category page ${finalSite} retrieved! Getting links...`)

  return useCache(
    `product pages from goBILDA page ${finalSite}`,
    () => {
      const links = [...document.querySelectorAll('li.product')]
        // rudimentary filter for cards that redirect to another category page
        .filter(
          (li) =>
            !li
              .querySelector('a')
              ?.textContent.toLowerCase()
              .startsWith('see also')
        )
        .map((li) => li.querySelector('a')!.href)

      return links
    },
    { lifetime: Temporal.Duration.from({ hours: 24 }) }
  )
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
  const { document, finalSite } = await getDocument(
    productURL,
    GOBILDA_SITE,
    rateLimitedFetch
  )
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

  return useCache(
    `products from goBILDA page ${productURL}`,
    async () => {
      const querySelectorStrict = (query: string): Element => {
        const node = document.querySelector(query)
        if (!node)
          throw Error(
            `querySelector failed for ${query} for product ${productURL}`
          )
        return node
      }

      const name = (
        querySelectorStrict('meta[itemprop="name"]') as HTMLMetaElement
      ).content
      const sku =
        `com.gobilda.${(querySelectorStrict('meta[itemprop="sku"]') as HTMLMetaElement).content}` as `com.gobilda.${string}`
      const description = (
        querySelectorStrict('meta[itemprop="description"]') as HTMLMetaElement
      ).content
      // TODO add logic for adding more keywords
      const image = {
        type: 'external',
        url: new URL(
          (querySelectorStrict('meta[itemprop="image"]') as HTMLMetaElement)
            .content
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
        ...(querySelectorStrict('meta[itemprop="weight"]') as HTMLMetaElement)
          .content
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
        [...document.querySelectorAll('tr.product-specsTable-row')].map(
          (el) => [
            `com.gobilda.${el.children[0].textContent}`,
            el.children[1].textContent
          ]
        )
      )

      return {
        name,
        sku,
        description,
        image,
        keywords,
        specifications: { weight: Number(weight), ...additionalSpecs }
      }
    },
    { lifetime: Temporal.Duration.from({ hours: 24 }) }
  )
}

const products = await main()

const { name } = await useFile(
  (file) => file.writeFile(JSON.stringify(products, null, 2)),
  'products.json'
)
console.log(`Final list written to ./dist/files/${name}`)
export default defineAdapter(products)
