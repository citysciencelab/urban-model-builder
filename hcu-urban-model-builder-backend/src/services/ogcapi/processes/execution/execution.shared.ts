// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../../../client.js'
import type {
  ProcessesExecution,
  ProcessesExecutionData,
  ProcessesExecutionService
} from './execution.class.js'

export type { ProcessesExecution, ProcessesExecutionData }

export type ProcessesExecutionClientService = Pick<
  ProcessesExecutionService<Params>,
  (typeof processesExecutionMethods)[number]
>

export const processesExecutionPath = 'ogcapi/processes/:processId/execution'

export const processesExecutionMethods: Array<keyof ProcessesExecutionService> = ['create']

export const ogcapiProcessesExecutionClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(processesExecutionPath, connection.service(processesExecutionPath), {
    methods: processesExecutionMethods
  })
}

// Add this service to the client service type index
declare module '../../../../client.js' {
  interface ServiceTypes {
    [processesExecutionPath]: ProcessesExecutionClientService
  }
}
