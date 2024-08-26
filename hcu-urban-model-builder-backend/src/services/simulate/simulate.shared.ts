// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client.js'
import type { Simulate, SimulateData, SimulatePatch, SimulateQuery, SimulateService } from './simulate.class.js'

export type { Simulate, SimulateData, SimulatePatch, SimulateQuery }

export type SimulateClientService = Pick<
  SimulateService<Params<SimulateQuery>>,
  (typeof simulateMethods)[number]
>

export const simulatePath = 'simulate'

export const simulateMethods: Array<keyof SimulateService> = ['find', 'get', 'create', 'patch', 'remove']

export const simulateClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(simulatePath, connection.service(simulatePath), {
    methods: simulateMethods
  })
}

// Add this service to the client service type index
declare module '../../client.js' {
  interface ServiceTypes {
    [simulatePath]: SimulateClientService
  }
}
