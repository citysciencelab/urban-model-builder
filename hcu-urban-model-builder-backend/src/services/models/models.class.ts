// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { KnexService } from '@feathersjs/knex'
import type { KnexAdapterParams, KnexAdapterOptions } from '@feathersjs/knex'
import { Model } from 'simulation'
import { plot } from 'simulation-viz-console'
import type { Action, Primitive, State, Stock, Transition, Population } from 'simulation/blocks'

import type { Application } from '../../declarations.js'
import type { Models, ModelsData, ModelsPatch, ModelsQuery, ModelsSimulate } from './models.schema.js'
import { Nodes, NodeType } from '../nodes/nodes.shared.js'
import { EdgeType } from '../edges/edges.shared.js'
import { SimulateAdapter } from './simulate/adapter.js'

export type { Models, ModelsData, ModelsPatch, ModelsQuery }

export interface ModelsParams extends KnexAdapterParams<ModelsQuery> {}

export interface ModelsServiceOptions extends KnexAdapterOptions {
  app: Application
}

// By default calls the standard Knex adapter service methods but can be customized with your own functionality.
export class ModelsService<ServiceParams extends Params = ModelsParams> extends KnexService<
  Models,
  ModelsData,
  ModelsParams,
  ModelsPatch
> {
  declare options: ModelsServiceOptions

  get app(): Application {
    return this.options.app
  }

  async simulate(data: ModelsSimulate, params?: ServiceParams) {
    return new SimulateAdapter(this.app).simulate(data) as any
  }
}

export const getOptions = (app: Application): ModelsServiceOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('postgresqlClient'),
    name: 'models',
    app
  }
}
