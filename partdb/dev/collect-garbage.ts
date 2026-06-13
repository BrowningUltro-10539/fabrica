import fs from 'node:fs/promises'
import path from 'node:path'
import url from 'node:url'
import type { CacheEntry } from '../src/internal/helpers.ts'

for await (const entry of await fs.opendir(
  path.join(
    path.dirname(url.fileURLToPath(import.meta.url)),
    '..',
    'cache',
    'files'
  )
)) {
  if (entry.isFile()) void handleFile(path.join(entry.parentPath, entry.name))
}

async function handleFile(path: string): Promise<void> {
  const data: CacheEntry<any> = JSON.parse(
    await fs.readFile(path, { encoding: 'utf-8' })
  )
  if (!data.expiration) return
  if (
    Temporal.Instant.compare(
      Temporal.Now.instant(),
      Temporal.Instant.from(data.expiration)
    ) === 1
  ) {
    console.log(`Expired entry found! Deleting ${path}...`)
    await fs.rm(path)
  }
}
