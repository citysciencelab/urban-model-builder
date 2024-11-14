// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { KnexService } from '@feathersjs/knex'
import type { KnexAdapterParams, KnexAdapterOptions } from '@feathersjs/knex'

import type { Application } from '../../declarations.js'
import type { Scenarios, ScenariosData, ScenariosPatch, ScenariosQuery } from './scenarios.schema.js'

export type { Scenarios, ScenariosData, ScenariosPatch, ScenariosQuery }

export interface ScenariosParams extends KnexAdapterParams<ScenariosQuery> {}

// By default calls the standard Knex adapter service methods but can be customized with your own functionality.
export class ScenariosService<ServiceParams extends Params = ScenariosParams> extends KnexService<
  Scenarios,
  ScenariosData,
  ScenariosParams,
  ScenariosPatch
> {
  async _findDefaultForModelVersion(modelsVersionsId: number) {
    const result = await this._find({
      query: {
        modelsVersionsId,
        isDefault: true
      }
    })
    if (result.total == 0) {
      return false
    } else {
      return result.data[0]
    }
  }
}

export const getOptions = (app: Application): KnexAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('postgresqlClient'),
    name: 'scenarios'
  }
}
