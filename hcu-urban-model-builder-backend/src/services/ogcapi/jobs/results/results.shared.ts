// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../../../client.js'
import type {
  JobResults,
  JobResultsData,
  JobResultsPatch,
  JobResultsQuery,
  JobResultsService
} from './results.class.js'

export type { JobResults, JobResultsData, JobResultsPatch, JobResultsQuery }

export type JobResultsClientService = Pick<
  JobResultsService<Params<JobResultsQuery>>,
  (typeof resultsMethods)[number]
>

export const resultsPath = 'ogcapi/jobs/:jobId/results'

export const resultsMethods: Array<keyof JobResultsService> = ['find']

export const resultsClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(resultsPath, connection.service(resultsPath), {
    methods: resultsMethods
  })
}

// Add this service to the client service type index
declare module '../../../../client.js' {
  interface ServiceTypes {
    [resultsPath]: JobResultsClientService
  }
}
