// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { MemoryService, MemoryServiceOptions } from '@feathersjs/memory'

import type { Application } from '../../declarations'
import type { Nodes, NodesData, NodesPatch, NodesQuery } from './nodes.schema'
import { AdapterParams } from '@feathersjs/adapter-commons'

export type { Nodes, NodesData, NodesPatch, NodesQuery }

export interface NodesParams extends AdapterParams<NodesQuery> { }

// By default calls the standard Knex adapter service methods but can be customized with your own functionality.
export class NodesService<ServiceParams extends Params = NodesParams> extends MemoryService<
  Nodes,
  NodesData,
  ServiceParams,
  NodesPatch
> { }

export const getOptions = (app: Application): MemoryServiceOptions => {
  return {
    paginate: app.get('paginate'),
    id: 'id',
  }
}
