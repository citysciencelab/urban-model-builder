// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { BadRequest } from '@feathersjs/errors'
import { KnexService } from '@feathersjs/knex'
import type { KnexAdapterParams, KnexAdapterOptions } from '@feathersjs/knex'

import type { Application } from '../../declarations.js'
import type {
  Scenarios,
  ScenariosCreate,
  ScenariosData,
  ScenariosPatch,
  ScenariosQuery
} from './scenarios.schema.js'

export type { Scenarios, ScenariosCreate, ScenariosData, ScenariosPatch, ScenariosQuery }

export interface ScenariosParams extends KnexAdapterParams<ScenariosQuery> {}

// By default calls the standard Knex adapter service methods but can be customized with your own functionality.
export class ScenariosService<ServiceParams extends Params = ScenariosParams> extends KnexService<
  Scenarios,
  ScenariosCreate,
  ScenariosParams,
  ScenariosPatch
> {
  async create(data: ScenariosCreate, params?: ScenariosParams): Promise<Scenarios>
  async create(data: ScenariosCreate[], params?: ScenariosParams): Promise<Scenarios[]>
  async create(
    data: ScenariosCreate | ScenariosCreate[],
    params?: ScenariosParams
  ): Promise<Scenarios | Scenarios[]> {
    if (Array.isArray(data) || data.values === undefined) {
      return super.create(data as ScenariosCreate, params)
    }

    // A named scenario and its values are saved together: either the preset
    // exists with all its values or not at all. The values are inserted
    // directly, so clients get a single `created` event for the scenario
    // instead of one per value.
    const { values, ...scenarioData } = data
    if (scenarioData.isDefault) {
      throw new BadRequest('Values can only be passed along for a named scenario.')
    }
    const nodeIds = new Set(values.map((value) => value.nodesId))
    if (nodeIds.size !== values.length) {
      throw new BadRequest('A scenario can hold only one value per node.')
    }

    return this.Model.transaction(async (trx) => {
      const scenario = await super.create(scenarioData, { ...params, transaction: { trx } } as ScenariosParams)
      if (values.length === 0) {
        return scenario
      }

      const [{ count }] = await trx('nodes')
        .whereIn('id', [...nodeIds])
        .where({ modelsVersionsId: scenario.modelsVersionsId, isParameter: true })
        .count<{ count: string }[]>('* as count')
      if (Number(count) !== nodeIds.size) {
        throw new BadRequest('Scenario values must belong to parameters of the same model version.')
      }

      await trx('scenarios_values').insert(
        values.map((value) => ({
          scenariosId: scenario.id,
          nodesId: value.nodesId,
          value: value.value
        }))
      )
      return scenario
    })
  }

  async _findDefaultForModelVersion(modelsVersionsId: string) {
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
