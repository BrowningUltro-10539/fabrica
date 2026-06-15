import { parentPort } from 'node:worker_threads'
import * as cheerio from 'cheerio'

export type Method = CheckIfFinalSite
export type Task = Omit<Method, 'return'>
export type ReturnValue<T extends Task> = Extract<
  Method,
  { operation: T['operation'] }
>['return']

export type CheckIfFinalSite = {
  operation: 'checkIfFinalSite'
  input: {
    url: string
    siteBuffer: ArrayBuffer
  }
  return: string
}

parentPort?.on('message', <T extends Task>(task: T): ReturnValue<T> | Error => {
  if (task.operation == 'checkIfFinalSite') {
    const { input } = task
    const $ = cheerio.loadBuffer(Buffer.from(input.siteBuffer))
    const newSiteURL = $('meta[http-equiv="refresh"]')
      .prop('content')
      .split(';url=')
      .at(1)
    return newSiteURL ?? input.url
  }
  return TypeError('operation not known')
})
