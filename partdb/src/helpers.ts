import type { FileHandle } from 'node:fs/promises'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { LocalFile, Product } from './types.ts'
import crypto from 'node:crypto'
import stream from 'node:stream/promises'
import url from 'node:url'
import { JSDOM } from 'jsdom'

const { O_CREAT, O_EXCL, O_RDWR } = fs.constants

const dbPath = path.join(
  path.dirname(url.fileURLToPath(import.meta.url)),
  '..',
  'build',
  'files'
)

export async function useFile(
  callback: (file: FileHandle) => Promise<void>
): Promise<LocalFile> {
  await using tempDir = await fs.mkdtempDisposable(
    path.join(os.tmpdir(), 'fabrica-partsdb-')
  )

  const filePath = path.join(tempDir.path, 'temp')
  await using file = await fs.open(filePath, O_CREAT | O_EXCL | O_RDWR)
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

export async function getDocument(siteURL: string) {
  const site = await fetch(siteURL)

  return new JSDOM(await site.text()).window.document
}
