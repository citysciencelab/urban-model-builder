import { parentPort } from 'node:worker_threads'
import { feathers } from '@feathersjs/feathers'
import { MemoryService } from '@feathersjs/memory'
import { SimulationAdapter } from '../shared/simulation-adapter/simulation-adapter.js'

/**
 * Runs simulations in a thread of its own (see simulation-runner.ts). The thread has no database connection:
 * it gets the model version with its nodes and edges and serves them to the simulation adapter from memory,
 * as the demo mode of the client does.
 */

export type SimulationJob = {
  id: number
  version: { id: string } & Record<string, unknown>
  nodes: ({ id: string } & Record<string, unknown>)[]
  edges: ({ id: string } & Record<string, unknown>)[]
  parameterValues: Record<string, number>
}

export type SimulationJobResult =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: { message: string; nodeId?: string | null } }

const quietLogger = { ...console, debug: () => {} }

const memoryService = (records: { id: string }[]) =>
  new MemoryService({
    id: 'id',
    store: Object.fromEntries(records.map((record) => [record.id, record])),
    paginate: { default: 100_000, max: 100_000 }
  })

async function run(job: SimulationJob) {
  const app = feathers()
  app.use('models-versions', memoryService([job.version]))
  app.use('nodes', memoryService(job.nodes))
  app.use('edges', memoryService(job.edges))

  const adapter = new SimulationAdapter(
    app as any,
    job.version.id,
    new Map(Object.entries(job.parameterValues)),
    quietLogger as typeof console
  )
  await adapter.simulate()
  return adapter.getResults()
}

parentPort!.on('message', async (job: SimulationJob) => {
  let message: SimulationJobResult
  try {
    message = { id: job.id, ok: true, result: await run(job) }
  } catch (error: any) {
    message = {
      id: job.id,
      ok: false,
      error: {
        message: String(error?.message ?? error),
        nodeId: error?.data?.nodeId ?? error?.nodeId ?? null
      }
    }
  }
  parentPort!.postMessage(message)
})

// tells the runner that the thread is loaded and the time limit of a simulation can start to count
parentPort!.postMessage({ ready: true })
