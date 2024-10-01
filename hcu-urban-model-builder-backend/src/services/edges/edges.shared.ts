// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client.js'
import type { Edges, EdgesData, EdgesPatch, EdgesQuery, EdgesService } from './edges.class.js'

export type { Edges, EdgesData, EdgesPatch, EdgesQuery }

export enum EdgeType {
  Link = 0,
  Flow,
  Transition,
  AgentPopulation
}

export type EdgesClientService = Pick<EdgesService<Params<EdgesQuery>>, (typeof edgesMethods)[number]>

export const edgesPath = 'edges'

export const edgesMethods: Array<keyof EdgesService> = ['find', 'get', 'create', 'patch', 'remove']

export const edgesClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(edgesPath, connection.service(edgesPath), {
    methods: edgesMethods
  })
}

// Add this service to the client service type index
declare module '../../client.js' {
  interface ServiceTypes {
    [edgesPath]: EdgesClientService
  }
}
