// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client.js'
import type {
  Scenarios,
  ScenariosData,
  ScenariosPatch,
  ScenariosQuery,
  ScenariosService
} from './scenarios.class.js'

export type { Scenarios, ScenariosData, ScenariosPatch, ScenariosQuery }

export type ScenariosClientService = Pick<
  ScenariosService<Params<ScenariosQuery>>,
  (typeof scenariosMethods)[number]
>

export const scenariosPath = 'scenarios'

export const scenariosMethods: Array<keyof ScenariosService> = ['find', 'get', 'create', 'patch', 'remove']

export const scenariosClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(scenariosPath, connection.service(scenariosPath), {
    methods: scenariosMethods
  })
}

// Add this service to the client service type index
declare module '../../client.js' {
  interface ServiceTypes {
    [scenariosPath]: ScenariosClientService
  }
}
