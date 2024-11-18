// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../../client.js'
import type { Jobs, JobsQuery, JobsService } from './jobs.class.js'

export type { Jobs, JobsQuery }

export type JobsClientService = Pick<JobsService<Params<JobsQuery>>, (typeof jobsMethods)[number]>

export const jobsPath = 'ogcapi/jobs'

export const jobsMethods: Array<keyof JobsService> = ['find', 'get', 'remove', 'results']

export const jobsClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(jobsPath, connection.service(jobsPath), {
    methods: jobsMethods
  })
}

// Add this service to the client service type index
declare module '../../../client.js' {
  interface ServiceTypes {
    [jobsPath]: JobsClientService
  }
}
