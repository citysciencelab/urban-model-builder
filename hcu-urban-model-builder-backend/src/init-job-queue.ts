import { logger } from './logger.js'
import { Application } from './declarations.js'
import { JobQueueAdapter } from './utils/job-queue-adapter/base.js'
import jobQueueAdapterFactory from './utils/job-queue-adapter/job-queue-adapter-factory.js'
import { Logger } from 'winston'
import { ModelsSimulate } from './services/models/models.schema.js'

export default async function (app: Application) {
  const jobQueueAdapter = jobQueueAdapterFactory('bullmq', logger, {})

  await jobQueueAdapter.start()

  app.set('jobQueue', jobQueueAdapter)

  await registerJobFunction(app, jobQueueAdapter)

  await registerJobTriggers(app, jobQueueAdapter, logger)
}

function runSimulation(app: Application) {
  return async (data: any) => {
    return await app
      .service('models')
      .simulate(
        { id: +data.id, nodeIdToParameterValueMap: data.nodeIdToParameterValueMap },
        { serializeForUMP: true }
      )
  }
}
async function registerJobFunction(app: Application, jobQueueAdapter: JobQueueAdapter<any>) {
  await jobQueueAdapter.receive('process_simulation', runSimulation(app))
}

async function registerJobTriggers(app: Application, jobQueueAdapter: JobQueueAdapter<any>, logger: Logger) {}
