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

const { O_CREAT, O_EXCL, O_RDWR, O_APPEND } = fs.constants

const dbPath = path.join(
  path.dirname(url.fileURLToPath(import.meta.url)),
  '..',
  'dist',
  'files'
)

export async function useFile(
  callback: (file: FileHandle) => Promise<void>
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
  const hasher = crypto.createHash('sha256')

  await stream.pipeline(file.createReadStream({ start: 0 }), hasher)
  const hash = hasher.digest('base64url')

  await fs.mkdir(dbPath, { recursive: true })
  await fs.copyFile(filePath, path.join(dbPath, hash))

  return {
    type: 'local',
    hash
  }
}

export const defineAdapter = (fn: Product[]) => fn

let inThrottle = false
const throttleQueue: Array<() => Promise<void>> = []
const MIN_WAIT_MS = 100

async function processQueue() {
  if (inThrottle || throttleQueue.length === 0) return
  inThrottle = true
  for (const request of throttleQueue) {
    void request()
    await setTimeout(MIN_WAIT_MS)
  }
  throttleQueue.length = 0
  inThrottle = false
}

const rateLimitedFetch: typeof fetch = (...args) =>
  new Promise((res, rej) => {
    throttleQueue.push(() =>
      fetch(...args)
        .then(res)
        .catch(rej)
    )
    void processQueue()
  })

/**
 *
 * @param siteURL URL to the site. Can either be the domain itself or a page on the website, like in an HTTP request.
 * @param baseSite The base site. Do NOT include a trailing slash!
 * @returns A JSDOM-based document object
 */
export async function getDocument(
  siteURL: string,
  baseSite: string
): Promise<{ document: Document; finalSite: string }> {
  if (siteURL.startsWith('/')) siteURL = baseSite + siteURL

  console.log(`Fetching ${siteURL}...`)

  const site = await rateLimitedFetch(siteURL, {
    headers: {
      'User-Agent': 'FTC 10539 (Ultro) Internal Project <ultro.browning.edu>'
    }
  })

  if (!site.ok)
    throw Error(
      `Request failed (${site.status} ${site.statusText}): ${await site.text()}`
    )

  const { document } = new JSDOM(await site.text()).window

  const meta = document.querySelector(
    'meta[http-equiv="refresh"]'
  ) as HTMLMetaElement
  if (meta) {
    const { content } = meta
    const newSiteURL = content.split(';url=')[1]
    return getDocument(newSiteURL, baseSite)
  }

  return { document, finalSite: siteURL }
}
