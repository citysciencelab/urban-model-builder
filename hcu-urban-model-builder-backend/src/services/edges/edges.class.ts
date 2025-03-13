// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { KnexAdapterOptions, KnexAdapterParams, KnexService } from '@feathersjs/knex'

import type { Application } from '../../declarations.js'
import type { Edges, EdgesData, EdgesPatch, EdgesQuery } from './edges.schema.js'

export type { Edges, EdgesData, EdgesPatch, EdgesQuery }

export interface EdgesParams extends KnexAdapterParams<EdgesQuery> {}

// By default calls the standard Knex adapter service methods but can be customized with your own functionality.
export class EdgesService<ServiceParams extends Params = EdgesParams> extends KnexService<
  Edges,
  EdgesData,
  ServiceParams,
  EdgesPatch
> {}

export const getOptions = (app: Application): KnexAdapterOptions => {
  return {
    paginate: {
      default: 10000,
      max: 10000
    },
    id: 'id',
    Model: app.get('postgresqlClient'),
    name: 'edges'
  }
}
