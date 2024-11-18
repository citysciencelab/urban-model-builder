// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#custom-services
import type { Id, NullableId, Params, ServiceInterface } from '@feathersjs/feathers'

import type { Application } from '../../../declarations.js'
import type { Processes, ProcessesQuery } from './processes.schema.js'

export type { Processes, ProcessesQuery }

export interface ProcessesServiceOptions {
  app: Application
}

export interface ProcessesParams extends Params<ProcessesQuery> { }

// This is a skeleton for a custom service class. Remove or add the methods you need here
export class ProcessesService<ServiceParams extends ProcessesParams = ProcessesParams>
  implements ServiceInterface<Processes, ServiceParams> {
  constructor(public options: ProcessesServiceOptions) { }

  async find(_params?: ServiceParams): Promise<Processes[]> {
    return []
  }

  async get(id: Id, _params?: ServiceParams): Promise<Processes> {
    return {
      id: 0,
      text: `A new message with ID: ${id}!`
    }
  }

  async execute(id: Id, _params?: ServiceParams): Promise<Processes> {
    return {
      id: 0,
      text: `A new message with ID: ${id}!`
    }
  }
}

export const getOptions = (app: Application) => {
  return { app }
}
