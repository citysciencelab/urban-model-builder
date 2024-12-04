// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#custom-services
import type { Id, NullableId, Params, ServiceInterface } from '@feathersjs/feathers'

import type { Application } from '../../../../declarations.js'
import { NotFound, Unprocessable } from '@feathersjs/errors'

type JobResults = any
type JobResultsData = any
type JobResultsPatch = any
type JobResultsQuery = any

export type { JobResults, JobResultsData, JobResultsPatch, JobResultsQuery }

export interface JobResultsServiceOptions {
  app: Application
}

export interface JobResultsParams extends Params<JobResultsQuery> {}

// This is a skeleton for a custom service class. Remove or add the methods you need here
export class JobResultsService<ServiceParams extends JobResultsParams = JobResultsParams> {
  constructor(public options: JobResultsServiceOptions) {}
  protected getJobId(params?: ServiceParams): number {
    const { jobId } = params?.route as { jobId: number }
    if (!jobId) {
      throw new Unprocessable('Missing jobId')
    }
    return jobId
  }
  async get(id: Id, params?: ServiceParams): Promise<JobResults> {
    throw new Error('Method not implemented')
  }

  async find(_params?: ServiceParams): Promise<JobResults[]> {
    const jobId = this.getJobId(_params)
    const jobQueue = this.options.app.get('jobQueue')
    const job = await jobQueue.getJob('process_simulation', jobId)
    if (!job) {
      throw new NotFound('Job not found')
    }
    return job.returnvalue
  }
}

export const getOptions = (app: Application) => {
  return { app }
}
