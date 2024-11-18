// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#custom-services
import type { Id, NullableId, Params, ServiceInterface } from '@feathersjs/feathers'

import type { Application } from '../../../declarations.js'
import type { Jobs, JobsQuery } from './jobs.schema.js'

export type { Jobs, JobsQuery }

export interface JobsServiceOptions {
  app: Application
}

export interface JobsParams extends Params<JobsQuery> { }

// This is a skeleton for a custom service class. Remove or add the methods you need here
export class JobsService<ServiceParams extends JobsParams = JobsParams>
  implements ServiceInterface<Jobs, ServiceParams> {
  constructor(public options: JobsServiceOptions) { }

  async find(_params?: ServiceParams): Promise<Jobs[]> {
    return []
  }

  async get(id: Id, _params?: ServiceParams): Promise<Jobs> {
    return {
      id: 0,
      text: `A new message with ID: ${id}!`
    }
  }

  async remove(id: NullableId, _params?: ServiceParams): Promise<Jobs> {
    return {
      id: 0,
      text: 'removed'
    }
  }

  async results(id: Id, _params?: ServiceParams): Promise<Jobs> {
    return {
      id: 0,
      text: `A new message with ID: ${id}!`
    }
  }
}

export const getOptions = (app: Application) => {
  return { app }
}
