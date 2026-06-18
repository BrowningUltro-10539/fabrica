import os from 'node:os'
import path from 'node:path'
import { Worker } from 'node:worker_threads'
import type { Transferable } from 'node:worker_threads'
export type * from './worker/index.ts'
import type { Task, Method, ReturnValue } from './worker/index.ts'

type WorkerEntry = { workerObj: Worker; status: 'idle' | 'running' }

export class WorkerPool {
  #workers: WorkerEntry[]
  #queue: Array<() => void> = []

  constructor(numWorkers: number) {
    this.#workers = Array.from({ length: numWorkers }, () => ({
      workerObj: new Worker(
        path.join(import.meta.dirname, 'worker', 'index.ts')
      ),
      status: 'idle'
    }))
  }

  [Symbol.asyncDispose] = () =>
    Promise.all(this.#workers.map((entry) => entry.workerObj.terminate())).then(
      () => {}
    )

  sendTask = <T extends Method>(
    task: Task<T>,
    transferList?: readonly Transferable[]
  ): Promise<ReturnValue<T>> =>
    new Promise((res, rej) => {
      const attempt = () => {
        const idleEnt = this.#workers.find((worker) => worker.status === 'idle')
        if (!idleEnt) {
          this.#queue.push(attempt)
          return
        }
        try {
          idleEnt.workerObj.postMessage(task, transferList)
        } catch (e) {
          throw Error(
            `intercepted error from posting message ${JSON.stringify(
              task,
              (_, value) => {
                if (value instanceof ArrayBuffer)
                  return `ArrayBuffer: ${new TextDecoder().decode(value)}`
                return value
              }
            )}: ${(e as Error).message}`
          )
        }
        console.log(`Worker is now running: ${task.operation}`)
        idleEnt.status = 'running'
        idleEnt.workerObj.once('message', (result) => {
          idleEnt.status = 'idle'
          this.#queue.shift()?.()
          if (Error.isError(result)) rej(result)
          res(result)
        })
      }
      attempt()
    })
}

export default new WorkerPool(os.availableParallelism())
