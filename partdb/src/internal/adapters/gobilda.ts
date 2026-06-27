import crypto from 'node:crypto'

/**
 * The goBILDA site seems to be scrapable most easily by
 * looking at their sitemap,
 * finding each of the most nested pages, and
 * turning each of the products on each page into an appropriate entry.
 */
import {
  defineAdapter,
  useFile,
  useCache,
  getFinalSite,
  createThrottled
} from '../helpers.ts'
import type { Keyword, Product } from '../types.ts'
import workerPool from '../worker-pool.ts'
import type {
  GetCategoryPages,
  GetProductData,
  GetProductPages
} from '../worker/org.gobilda.ts'

const GOBILDA_SITE = 'https://www.gobilda.com'
const MIN_WAIT_MS = 1000

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
        }
        // [finalSiteBuffer]
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
  const { finalSiteBuffer, finalSite } = await getFinalSite(
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
    () =>
      workerPool.sendTask<GetProductPages>(
        {
          operation: 'org.gobilda.getProductPages',
          input: { siteBuffer: finalSiteBuffer }
        }
        // [finalSiteBuffer]
      ),
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
  const { finalSiteBuffer, finalSite } = await getFinalSite(
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
    () => {
      try {
        return workerPool.sendTask<GetProductData>(
          {
            operation: 'org.gobilda.getProductData',
            input: {
              siteBuffer: finalSiteBuffer,
              keywords
            }
          }
          // [finalSiteBuffer]
        )
      } catch (e) {
        if (e instanceof TypeError)
          throw TypeError(
            `Type error when parsing product page ${finalSite} (originally ${productURL}): ${e.message}`
          )
        throw e
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

if (import.meta.main) await workerPool[Symbol.asyncDispose]()
