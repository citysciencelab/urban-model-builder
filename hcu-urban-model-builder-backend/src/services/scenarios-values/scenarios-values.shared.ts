// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client.js'
import type {
  ScenarioValues,
  ScenarioValuesData,
  ScenarioValuesPatch,
  ScenarioValuesQuery,
  ScenarioValuesService
} from './scenarios-values.class.js'

export type { ScenarioValues, ScenarioValuesData, ScenarioValuesPatch, ScenarioValuesQuery }

export type ScenarioValuesClientService = Pick<
  ScenarioValuesService<Params<ScenarioValuesQuery>>,
  (typeof scenarioValuesMethods)[number]
>

export const scenarioValuesPath = 'scenarios-values'

export const scenarioValuesMethods: Array<keyof ScenarioValuesService> = [
  'find',
  'get',
  'create',
  'patch',
  'remove'
]

export const scenarioValuesClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(scenarioValuesPath, connection.service(scenarioValuesPath), {
    methods: scenarioValuesMethods
  })
}

// Add this service to the client service type index
declare module '../../client.js' {
  interface ServiceTypes {
    [scenarioValuesPath]: ScenarioValuesClientService
  }
}
