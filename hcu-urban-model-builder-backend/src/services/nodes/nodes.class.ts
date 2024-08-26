// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { KnexAdapterOptions, KnexAdapterParams, KnexService } from '@feathersjs/knex'

import type { Application } from '../../declarations.js'
import type { Nodes, NodesData, NodesPatch, NodesQuery } from './nodes.schema.js'

export type { Nodes, NodesData, NodesPatch, NodesQuery }

export interface NodesParams extends KnexAdapterParams<NodesQuery> { }

// By default calls the standard Knex adapter service methods but can be customized with your own functionality.
export class NodesService<ServiceParams extends Params = NodesParams> extends KnexService<
  Nodes,
  NodesData,
  ServiceParams,
  NodesPatch
> { }

export const getOptions = (app: Application): KnexAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    id: 'id',
    Model: app.get('postgresqlClient'),
    name: 'nodes',
  }
}
