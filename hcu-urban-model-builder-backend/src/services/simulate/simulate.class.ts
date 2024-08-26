// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#custom-services
import type { Id, NullableId, Params, ServiceInterface } from '@feathersjs/feathers'
import { Model } from 'simulation'

import type { Application } from '../../declarations.js'
import type { Simulate, SimulateData, SimulatePatch, SimulateQuery } from './simulate.schema.js'

export type { Simulate, SimulateData, SimulatePatch, SimulateQuery }

export interface SimulateServiceOptions {
  app: Application
}

export interface SimulateParams extends Params<SimulateQuery> { }

// This is a skeleton for a custom service class. Remove or add the methods you need here
export class SimulateService<ServiceParams extends SimulateParams = SimulateParams>
  implements ServiceInterface<Simulate, SimulateData, ServiceParams, SimulatePatch> {
  constructor(public options: SimulateServiceOptions) { }

  async find(_params?: ServiceParams): Promise<Simulate[]> {
    return []
  }

  async get(id: Id, _params?: ServiceParams): Promise<Simulate> {
    return {
      id: 0,
      text: `A new message with ID: ${id}!`
    }
  }

  async create(data: SimulateData, params?: ServiceParams): Promise<Simulate>
  async create(data: SimulateData[], params?: ServiceParams): Promise<Simulate[]>
  async create(data: SimulateData | SimulateData[], params?: ServiceParams): Promise<Simulate | Simulate[]> {
    // const { Model } = await import('simulation')
    const m = new Model({
      timeStart: 2020,
      timeLength: 100,
      timeUnits: "Years"
    });

    console.log(m);



    return {
      id: 0,
    }
  }

  // This method has to be added to the 'methods' option to make it available to clients
  async update(id: NullableId, data: SimulateData, _params?: ServiceParams): Promise<Simulate> {
    return {
      id: 0,
      ...data
    }
  }

  async patch(id: NullableId, data: SimulatePatch, _params?: ServiceParams): Promise<Simulate> {
    return {
      id: 0,
      text: `Fallback for ${id}`,
      ...data
    }
  }

  async remove(id: NullableId, _params?: ServiceParams): Promise<Simulate> {
    return {
      id: 0,
      text: 'removed'
    }
  }
}

export const getOptions = (app: Application) => {
  return { app }
}
