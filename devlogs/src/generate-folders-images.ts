import fs from 'node:fs/promises'
import path from 'node:path'

import * as cheerio from 'cheerio'

const file = await fs.readFile(
  path.join(import.meta.dirname, '..', 'snapshot.html')
)
const $ = cheerio.loadBuffer(file)

for (const entry of $('article.feed-post-card--linked')) {
  const time = $(entry).find('time').prop('datetime')
  const timeLogged = $(entry)
    .find('p.feed-post-card__duration')
    .text()
    .slice(0, -' logged'.length)
  const mediaURL = $(entry)
    .find('img.feed-post-card__image, video.feed-post-card__video')
    .prop('src')
  console.log(
    `Time: ${time}; time spent: ${timeLogged}, media URL: ${mediaURL}`
  )
  try {
    await fs.mkdir(time, { recursive: true })
    await fs.writeFile(
      path.join(time, `${time}.md`),
      `---
time_logged: '${timeLogged}'
---
`,
      { flag: 'wx' }
    )
  } catch (error) {
    console.log(error)
  }

  try {
    if (mediaURL) {
      const mediaName = decodeURIComponent(
        new URL(mediaURL).pathname.split('/').filter(Boolean).pop() || ''
      )
      console.log(`Fetching ${mediaName}...`)
      const media = await fetch(mediaURL)
      await fs.writeFile(path.join(time, mediaName), await media.bytes(), {
        flag: 'wx'
      })
    }
  } catch (error) {
    console.log(error)
  }
}
