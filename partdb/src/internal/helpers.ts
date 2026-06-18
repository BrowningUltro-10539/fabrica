import crypto from 'node:crypto'
import type { FileHandle } from 'node:fs/promises'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import stream from 'node:stream/promises'
import { setTimeout } from 'node:timers/promises'
import url from 'node:url'

import type { JsonValue } from 'type-fest'

import type { LocalFile, Product } from './types.ts'
import type { CheckIfFinalSite } from './worker-pool.ts'
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

const cacheBlobPath = path.join(
  path.dirname(url.fileURLToPath(import.meta.url)),
  '..',
  '..',
  'cache',
  'blobs'
)

await Promise.all([
  fs.mkdir(dbPath, { recursive: true }),
  fs.mkdir(cachePath, { recursive: true }),
  fs.mkdir(cacheBlobPath, { recursive: true })
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

export type Cacheable = JsonValue | ArrayBuffer

export type CacheEntry<Value extends Cacheable> = Value extends JsonValue
  ? JsonValueEntry<Value>
  : ArrayBufferEntry

export type JsonValueEntry<Value extends JsonValue> = {
  expiration?: string
  value: Value
  blob: null
}

export type ArrayBufferEntry = {
  expiration?: string
  value: null
  blob: string
}

const memoryCache: Record<string, Cacheable> = Object.create(null)
const SIZE_THRESHOLD = 50_000

const fileWriters: Record<string, Promise<void>> = Object.create(null)
const writeFile = (
  filePath: string,
  data: string | NodeJS.ArrayBufferView
): Promise<void> => {
  if (filePath in fileWriters) {
    fileWriters[filePath] = fileWriters[filePath].then(() =>
      fs.writeFile(filePath, data)
    )
    return fileWriters[filePath]
  }
  fileWriters[filePath] = fs.writeFile(filePath, data)
  return fileWriters[filePath]
}

/**
 * Cache a computation that produces a serializable value.
 * @param key Globally unique string representing the value
 * @param callback Function to compute the value
 * @param options Caching options
 */
export async function useCache<Value extends Cacheable>(
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
    const entry: CacheEntry<Value> = JSON.parse(file) as CacheEntry<Value>
    if (
      entry.expiration &&
      Temporal.Instant.compare(
        Temporal.Now.instant(),
        Temporal.Instant.from(entry.expiration)
      ) === 1 // current instant is later than expiration instant
    ) {
      if (entry.blob)
        try {
          await fs.rm(path.join(cacheBlobPath, entry.blob))
        } catch {}
      throw new CacheMissError(`useCache cache entry for ${key} expired`)
    }
    let finalValue: Value
    if (entry.blob) {
      try {
        finalValue = (await fs.readFile(path.join(cacheBlobPath, entry.blob)))
          .buffer as Value
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT')
          throw new CacheMissError(`useCache blob entry for ${key} not found`)
        throw e
      }
      if ((finalValue as ArrayBuffer).byteLength < SIZE_THRESHOLD)
        memoryCache[keyHash] = (finalValue as ArrayBuffer).slice(0)
    } else {
      finalValue = entry.value as Value
      if (JSON.stringify(finalValue).length < SIZE_THRESHOLD)
        memoryCache[keyHash] = finalValue
    }
    return finalValue
  } catch (e) {
    if (!(e instanceof CacheMissError)) throw e
    const value = await callback()
    const expiration = options?.lifetime
      ? Temporal.Now.instant().add(options.lifetime).toJSON()
      : undefined

    if (!(value instanceof ArrayBuffer)) {
      if (JSON.stringify(value).length < SIZE_THRESHOLD)
        memoryCache[keyHash] = value
      await writeFile(
        path.join(cachePath, keyHash),
        JSON.stringify({
          expiration,
          value,
          blob: null
        } satisfies JsonValueEntry<JsonValue>)
      )
    } else {
      if ((value as ArrayBuffer).byteLength < SIZE_THRESHOLD)
        memoryCache[keyHash] = value.slice(0)
      const valueHash = crypto
        .createHash('sha256')
        .update(new DataView(value))
        .digest('base64url')
      await Promise.all([
        writeFile(
          path.join(cachePath, keyHash),
          JSON.stringify({
            expiration,
            value: null,
            blob: valueHash
          } satisfies ArrayBufferEntry)
        ),
        writeFile(path.join(cacheBlobPath, valueHash), new DataView(value))
      ])
    }
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

/**
 * Get the final site and its buffer from a URL.
 *
 * @param siteURL URL to the site.
 * Can either be the domain itself or
 * a page on the website (`/foo.html`, `/bar`),
 * like in an HTTP request.
 *
 * @param baseSite The base site. Do NOT include a trailing slash!
 *
 * @returns An ArrayBuffer of the final site and a string of its URL
 */
export async function getFinalSite(
  siteURL: string,
  baseSite: string,
  fetcher: typeof fetch
): Promise<{ finalSiteBuffer: ArrayBuffer; finalSite: string }> {
  if (siteURL.startsWith('/')) siteURL = baseSite + siteURL

  const siteBuffer = await useCache(
    `Site buffer for ${siteURL}`,
    async () => {
      console.log(`Fetching ${siteURL}...`)

      const site = await fetcher(siteURL, {
        headers: {
          'User-Agent':
            'FTC 10539 (Ultro) Internal Project <ultro.browning.edu>'
        }
      })

      if (!site.ok)
        throw Error(
          `Request failed (${site.status} ${site.statusText}): ${await site.text()}`
        )
      return site.arrayBuffer()
    },
    { lifetime: Temporal.Duration.from({ hours: 24 }) }
  )

  const newSiteURL = await workerPool.sendTask<CheckIfFinalSite>(
    {
      operation: 'checkIfFinalSite',
      input: { url: siteURL, siteBuffer }
    }
    // [siteBuffer]
  )
  if (newSiteURL !== siteURL) return getFinalSite(newSiteURL, baseSite, fetcher)
  // note to future self: this *could* be optimized in the future by
  // somehow reusing the worker's cheerio instance and
  // not having to keep on disposing and rebuilding doms.

  return { finalSiteBuffer: siteBuffer, finalSite: siteURL }
}

if (import.meta.main) await workerPool[Symbol.asyncDispose]()
