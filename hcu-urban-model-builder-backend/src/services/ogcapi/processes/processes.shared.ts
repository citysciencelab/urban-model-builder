// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../../client.js'
import type {
  Processes,
  ProcessesQuery,
  ProcessesService
} from './processes.class.js'

export type { Processes, ProcessesQuery }

export type ProcessesClientService = Pick<
  ProcessesService<Params<ProcessesQuery>>,
  (typeof processesMethods)[number]
>

export const processesPath = 'ogcapi/processes'

export const processesMethods: Array<keyof ProcessesService> = ['find', 'get', 'execute']

export const processesClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(processesPath, connection.service(processesPath), {
    methods: processesMethods
  })
}

// Add this service to the client service type index
declare module '../../../client.js' {
  interface ServiceTypes {
    [processesPath]: ProcessesClientService
  }
}
