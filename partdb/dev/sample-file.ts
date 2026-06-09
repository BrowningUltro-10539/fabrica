import { useFile } from '../src/helpers.ts'

let object = {
  item1: await useFile(async (file) => {
    await file.write('hello, world!\n')
  }),
  item2: await useFile(async (file) => {
    await file.write('hello, second world!\n')
  })
}

console.log(object)
