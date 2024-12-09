// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#custom-services
import type { Params, ServiceInterface } from '@feathersjs/feathers'

import type { Application } from '../../../declarations.js'
import { Job } from 'bullmq'
import { NotFound } from '@feathersjs/errors'

type Jobs = any
type JobsData = { jobs: any[]; links: any[] }
type JobsPatch = any
type JobsQuery = any

export type { Jobs, JobsData, JobsPatch, JobsQuery }

export interface JobsServiceOptions {
  app: Application
}

export interface JobsParams extends Params<JobsQuery> {}

// This is a skeleton for a custom service class. Remove or add the methods you need here
export class JobsService<ServiceParams extends JobsParams = JobsParams> {
  constructor(public options: JobsServiceOptions) {}

  private async prepareJobData(job: Job) {
    const jobState = await job.getState()
    const message = jobState === 'failed' ? job.failedReason : ''
    return {
      type: 'process',
      jobId: job.id,
      processID: job.data.id,
      state: this.mapStatus(jobState),
      created: new Date(job.timestamp).toISOString(),
      started: job.processedOn ? new Date(job.processedOn).toISOString() : null,
      finished: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
      message: message,
      inputs: job.data.inputs,
      links: [
        { href: `/ogcapi/jobs/${job.id}`, rel: 'self' },
        { href: '/ogcapi/jobs', rel: 'collection' },
        { href: `/ogcapi/jobs/${job.id}/results`, rel: 'results' }
      ]
    }
  }
  private mapStatus(status: string) {
    switch (status) {
      case 'completed':
        return 'successful'
      case 'waiting':
        return 'accepted'
      case 'active':
        return 'running'
      case 'failed':
        return 'failed'
      default:
        return 'accepted'
    }
  }
  async find(_params?: ServiceParams): Promise<JobsData> {
    const jobQueue = this.options.app.get('jobQueue')
    const jobs = await jobQueue.getJobs('process_simulation')
    const jobsData = await Promise.all(jobs.map(async (job: Job) => await this.prepareJobData(job)))
    return { jobs: jobsData, links: [{ href: '/ogcapi/jobs' }] }
  }

  async get(id: Number, _params?: ServiceParams): Promise<Jobs> {
    const jobQueue = this.options.app.get('jobQueue')
    const job = await jobQueue.getJob('process_simulation', id)
    if (!job) {
      throw new NotFound('Job not found')
    }
    return this.prepareJobData(job)
  }

  async remove(id: Number, _params?: ServiceParams): Promise<Jobs> {
    return {
      id: 0,
      text: 'removed'
    }
  }
}

export const getOptions = (app: Application) => {
  return { app }
}
