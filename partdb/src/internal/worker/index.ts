import { parentPort } from 'node:worker_threads'

import * as cheerio from 'cheerio'

import * as goBILDA from './gobilda.ts'

export type Method =
  | CheckIfFinalSite
  | goBILDA.GetCategoryPages
  | goBILDA.GetProductPages
export type Task<T extends Method> = T extends Method
  ? Omit<T, 'return'>
  : never
export type ReturnValue<T extends Method> = T['return']

export type CheckIfFinalSite = {
  operation: 'checkIfFinalSite'
  input: {
    url: string
    siteBuffer: ArrayBuffer
  }
  return: string
}

export type MethodFromOperation<T extends Method['operation']> = Extract<
  Method,
  { operation: T }
>

type HandlerMap = {
  [O in Method['operation']]: (
    input: MethodFromOperation<O>['input']
  ) => MethodFromOperation<O>['return']
}

const taskMap: HandlerMap = {
  checkIfFinalSite: (input) => {
    const $ = cheerio.loadBuffer(Buffer.from(input.siteBuffer))
    const newSiteURL = $('meta[http-equiv="refresh"]')
      .attr('content')
      ?.split(';url=')
      .at(1)
    return newSiteURL ?? input.url
  },
  ...goBILDA.handleMessage
}

parentPort?.on(
  'message',
  <T extends Method>(task: Task<T>): ReturnValue<T> | Error => {
    const handler = taskMap[task.operation] as
      | ((input: typeof task.input) => ReturnValue<Method>)
      | undefined

    return handler?.(task.input) ?? TypeError('operation not known')
  }
)
