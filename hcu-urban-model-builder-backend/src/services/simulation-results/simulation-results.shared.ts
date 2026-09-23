// Path for the service on the Feathers application
import type { Params } from '@feathersjs/feathers'
import type { SimulationResultsService } from './simulation-results.class.js'

export const simulationResultsPath = 'simulation-results'

export type SimulationResultsParams = Params

export const simulationResultsMethods = [
  'find',
  'get',
  'create',
  'patch',
  'remove'
] as const

export type SimulationResultsClientService = Pick<
  SimulationResultsService,
  typeof simulationResultsMethods[number]
>
