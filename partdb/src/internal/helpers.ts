import type { FileHandle } from 'node:fs/promises'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { LocalFile, Product } from './types.ts'
import crypto from 'node:crypto'
import stream from 'node:stream/promises'
import url from 'node:url'
import { JSDOM } from 'jsdom'
import { setTimeout } from 'node:timers/promises'
import type { JsonValue } from 'type-fest'
import workerPool from './worker-pool.ts'

/* -------------------------------------------------------------------------- */
/*                                TYPE HELPERS                                */
/* -------------------------------------------------------------------------- */

export const defineAdapter = (fn: Product[]) => fn

/* -------------------------------------------------------------------------- */
/*                          CACHING AND FILE CREATION                         */
/* -------------------------------------------------------------------------- */

const { O_CREAT, O_EXCL, O_RDWR, O_APPEND } = fs.constants

const dbPath = path.join(
  path.dirname(url.fileURLToPath(import.meta.url)),
  '..',
  '..',
  'dist',
  'files'
)

const cachePath = path.join(
  path.dirname(url.fileURLToPath(import.meta.url)),
  '..',
  '..',
  'cache',
  'files'
)

await Promise.all([
  fs.mkdir(dbPath, { recursive: true }),
  fs.mkdir(cachePath, { recursive: true })
])
/**
 * Hook for creating files for object storage for the site.
 * This is most likely a STEP file.
 *
 * @param callback Logic to handle writing the file.
 * The file is read-write, with
 * append-only writes.
 *
 * @param name Name of the file.
 * If not given, the name is assigned
 * the hash of the file's contents.
 *
 * @returns An object that contains the type of the file (local) and its name.
 */
export async function useFile(
  callback: (file: FileHandle) => Promise<void>,
  name?: string
): Promise<LocalFile> {
  await using tempDir = await fs.mkdtempDisposable(
    path.join(os.tmpdir(), 'fabrica-partsdb-')
  )

  const filePath = path.join(tempDir.path, 'temp')
  await using file = await fs.open(
    filePath,
    O_CREAT | O_EXCL | O_RDWR | O_APPEND
  )
  await callback(file)
  if (!name) {
    const hasher = crypto.createHash('sha256')

    await stream.pipeline(file.createReadStream({ start: 0 }), hasher)
    name = hasher.digest('base64url')
  }

  await fs.copyFile(filePath, path.join(dbPath, name))

  return {
    type: 'local',
    name
  }
}

/**
 * Error thrown within useCache when the cache is missed.
 */
class CacheMissError extends Error {}

export type CacheEntry<Value extends JsonValue> = {
  expiration?: string
  value: Value
}

const memoryCache: Record<string, JsonValue> = Object.create(null)
const SIZE_THRESHOLD = 50_000

/**
 * Cache a computation that produces a serializable value.
 * @param key Globally unique string representing the value
 * @param callback Function to compute the value
 * @param options Caching options
 */
export async function useCache<Value extends JsonValue>(
  key: string,
  callback: (() => Promise<Value>) | (() => Value),
  options?: {
    /**
     * An optional duration from initial creation of the cached value.
     * If not given, the value is cached indefinitely.
     */
    lifetime?: Temporal.Duration
  }
): Promise<Value> {
  // every cached value is keyed by the base64url hash of
  // the inputted key. it's kinda overkill since
  // all i realistically need is a key sanitizer
  // but i'm too lazy to make it myself or
  // import another library.
  const keyHash = crypto.createHash('sha256').update(key).digest('base64url')
  if (keyHash in memoryCache) return memoryCache[keyHash] as Value

  // within each file is a json blob containing
  // the value and the expiration date if provided.

  try {
    // check cache
    let file: string
    try {
      file = await fs.readFile(path.join(cachePath, keyHash), {
        encoding: 'utf-8'
      })
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT')
        throw new CacheMissError(`useCache cache entry for ${key} not found`)
      throw e
    }
    const { expiration, value } = JSON.parse(file) as CacheEntry<Value>
    if (
      expiration &&
      Temporal.Instant.compare(
        Temporal.Now.instant(),
        Temporal.Instant.from(expiration)
      ) === 1 // current instant is later than expiration instant
    )
      throw new CacheMissError(`useCache cache entry for ${key} expired`)
    if (JSON.stringify(value).length < SIZE_THRESHOLD)
      memoryCache[keyHash] = value
    return value
  } catch (e) {
    if (!(e instanceof CacheMissError)) throw e
    const value = await callback()
    const expiration = options?.lifetime
      ? Temporal.Now.instant().add(options.lifetime).toJSON()
      : undefined
    if (JSON.stringify(value).length < SIZE_THRESHOLD)
      memoryCache[keyHash] = value
    await fs.writeFile(
      path.join(cachePath, keyHash),
      JSON.stringify({ expiration, value } satisfies CacheEntry<Value>)
    )
    return value
  }
}

/* -------------------------------------------------------------------------- */
/*                              RESOURCE FETCHING                             */
/* -------------------------------------------------------------------------- */

/**
 * Create a function that throttles an async operation.
 * @param callback The async function to throttle
 * @param timeMs The minimum time between function invocations
 */
export function createThrottled<Args extends any[], Return>(
  callback: (...args: Args) => Promise<Return>,
  timeMs: number
): (...args: Args) => Promise<Return> {
  let promise: Promise<void> = Promise.resolve()

  return (...args) => {
    const promiseStart = promise
    promise = promise.then(() => setTimeout(timeMs))
    return promiseStart.then(() => callback(...args))
  }
}

const MIN_WAIT_MS = 100
const rateLimitedFetch: typeof fetch = createThrottled(fetch, MIN_WAIT_MS)

/**
 * Get the document object from a URL.
 *
 * @param siteURL URL to the site.
 * Can either be the domain itself or
 * a page on the website (`/foo.html`, `/bar`),
 * like in an HTTP request.
 *
 * @param baseSite The base site. Do NOT include a trailing slash!
 *
 * @returns A JSDOM-based document object
 */
export async function getDocument(
  siteURL: string,
  baseSite: string
): Promise<{ document: Document; finalSite: string }> {
  if (siteURL.startsWith('/')) siteURL = baseSite + siteURL

  const siteText = await useCache(
    `Site text for ${siteURL}`,
    async () => {
      console.log(`Fetching ${siteURL}...`)

      const site = await rateLimitedFetch(siteURL, {
        headers: {
          'User-Agent':
            'FTC 10539 (Ultro) Internal Project <ultro.browning.edu>'
        }
      })

      if (!site.ok)
        throw Error(
          `Request failed (${site.status} ${site.statusText}): ${await site.text()}`
        )
      return await site.text()
    },
    { lifetime: Temporal.Duration.from({ hours: 24 }) }
  )

  const siteBuffer = new TextEncoder().encode(siteText).buffer

  const newSiteURL = await workerPool.sendTask(
    {
      operation: 'checkIfFinalSite',
      input: { url: siteURL, siteBuffer }
    },
    [siteBuffer]
  )
  if (newSiteURL !== siteURL) return getDocument(newSiteURL, baseSite)

  const { document } = new JSDOM(siteText).window

  return { document, finalSite: siteURL }
}
