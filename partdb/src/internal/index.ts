import fs from 'node:fs/promises'
import url from 'node:url'
import path from 'node:path'
import type { Product } from './types.ts'

// no `await using` needed here since
// going through the iterator automatically disposes of the resource.
const dir = await fs.opendir(
  path.join(path.dirname(url.fileURLToPath(import.meta.url)), 'adapters')
)

const adapters: Promise<Product[]>[] = []
for await (const entry of dir) {
  if (entry.isFile())
    adapters.push(
      import(/* @vite-ignore */ path.join(entry.parentPath, entry.name)).then(
        (module) => module.default
      )
    )
}

export default (await Promise.all(adapters)).flat()
