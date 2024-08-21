// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { MemoryService, MemoryServiceOptions } from '@feathersjs/memory'
import { AdapterParams } from '@feathersjs/adapter-commons'

import type { Application } from '../../declarations'
import type { Edges, EdgesData, EdgesPatch, EdgesQuery } from './edges.schema'

export type { Edges, EdgesData, EdgesPatch, EdgesQuery }

export interface EdgesParams extends AdapterParams<EdgesQuery> { }

// By default calls the standard Knex adapter service methods but can be customized with your own functionality.
export class EdgesService<ServiceParams extends Params = EdgesParams> extends MemoryService<
  Edges,
  EdgesData,
  ServiceParams,
  EdgesPatch
> { }

export const getOptions = (app: Application): MemoryServiceOptions => {
  return {
    paginate: app.get('paginate'),
    id: 'id',
  }
}
