import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Worker } from 'node:worker_threads'
import type { Application } from '../declarations.js'
import type { SimulationJob, SimulationJobResult } from './simulation-worker.js'
import { ToolError } from './types.js'

/**
 * Runs the simulations that tools start, outside the thread that serves requests.
 *
 * A simulation is a synchronous computation: in the server's own thread it would stop every other request
 * until it is done, and a model that never finishes would stop the server for good. Here it runs in a worker
 * thread that is terminated when it takes too long. Only a few simulations run at the same time; further
 * ones wait, and are turned away when too many are waiting already.
 */

const MAX_WAITING = 20

type Pending = {
  job: Omit<SimulationJob, 'id'>
  timeoutMs: number
  resolve: (result: unknown) => void
  reject: (error: Error) => void
}

// The worker is TypeScript when the server runs from source (development, tests) and JavaScript once compiled
const workerUrl = (() => {
  const compiled = new URL('./simulation-worker.js', import.meta.url)
  return existsSync(fileURLToPath(compiled)) ? compiled : new URL('./simulation-worker.ts', import.meta.url)
})()

/** A worker thread that runs one simulation at a time and is kept for the next one. */
type PooledWorker = {
  worker: Worker
  /** Resolves when the thread has loaded its code. */
  ready: Promise<void>
  current: { id: number; pending: Pending; timer: NodeJS.Timeout } | null
}

const idleWorkers: PooledWorker[] = []
const waiting: Pending[] = []
let running = 0
let nextJobId = 1

function createWorker(): PooledWorker {
  let markReady = () => {}
  const pooled: PooledWorker = {
    worker: new Worker(workerUrl),
    ready: new Promise((resolve) => (markReady = resolve)),
    current: null
  }

  /** Ends the current simulation of this worker and starts the next waiting one. */
  const settle = (reusable: boolean, outcome: (pending: Pending) => void) => {
    const { current } = pooled
    if (!current) {
      return
    }
    pooled.current = null
    clearTimeout(current.timer)
    running--
    if (reusable) {
      // an idle worker must not keep the process from exiting
      pooled.worker.unref()
      idleWorkers.push(pooled)
    } else {
      void pooled.worker.terminate()
    }
    outcome(current.pending)
    const next = waiting.shift()
    if (next) {
      start(next)
    }
  }

  pooled.worker.on('message', (message: SimulationJobResult | { ready: true }) => {
    if ('ready' in message) {
      markReady()
      return
    }
    if (message.id !== pooled.current?.id) {
      return
    }
    settle(true, (pending) =>
      message.ok
        ? pending.resolve(message.result)
        : pending.reject(
            new ToolError('simulation_failed', `The simulation failed: ${message.error.message}`, {
              nodeId: message.error.nodeId ?? undefined
            })
          )
    )
  })
  const onFailure = (reason: string) => {
    const index = idleWorkers.indexOf(pooled)
    if (index >= 0) {
      idleWorkers.splice(index, 1)
    }
    settle(false, (pending) =>
      pending.reject(new ToolError('simulation_failed', `The simulation failed: ${reason}`))
    )
  }
  pooled.worker.on('error', (error) => onFailure(error.message))
  pooled.worker.on('exit', () => onFailure('the simulation process ended unexpectedly.'))
  ;(pooled as PooledWorker & { settle: typeof settle }).settle = settle
  return pooled
}

function start(pending: Pending) {
  running++
  // Workers are kept for further simulations, because starting one takes a moment
  const pooled = (idleWorkers.pop() ?? createWorker()) as PooledWorker & {
    settle: (reusable: boolean, outcome: (pending: Pending) => void) => void
  }
  pooled.worker.ref()
  const id = nextJobId++

  // the time limit is for the simulation, not for loading the thread, which takes longer the first time
  const timer = setTimeout(() => {}, 0)
  pooled.current = { id, pending, timer }
  void pooled.ready.then(() => {
    if (pooled.current?.id !== id) {
      return
    }
    pooled.current.timer = setTimeout(() => {
      // the thread is busy computing and cannot be asked to stop, so it is terminated
      pooled.settle(false, (stopped) =>
        stopped.reject(
          new ToolError(
            'simulation_failed',
            `The simulation was stopped because it took longer than ${Math.round(stopped.timeoutMs / 1000)} seconds. Reduce the time length, increase the time step or simplify the model.`
          )
        )
      )
    }, pending.timeoutMs)
    pooled.worker.postMessage({ ...pending.job, id } satisfies SimulationJob)
  })
}

/** Simulates a model version, given with its graph, and returns the result of the simulation adapter. */
export function runSimulation(app: Application, job: Omit<SimulationJob, 'id'>): Promise<any> {
  const { maxConcurrentSimulations, simulationTimeoutSeconds } = app.get('limits')

  return new Promise((resolve, reject) => {
    const pending: Pending = { job, timeoutMs: simulationTimeoutSeconds * 1000, resolve, reject }
    if (running < maxConcurrentSimulations) {
      start(pending)
    } else if (waiting.length < MAX_WAITING) {
      waiting.push(pending)
    } else {
      reject(
        new ToolError('rate_limited', 'Too many simulations are running at the moment. Try again shortly.')
      )
    }
  })
}
