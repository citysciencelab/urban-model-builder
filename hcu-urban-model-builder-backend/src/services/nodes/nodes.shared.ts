// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type { Nodes, NodesData, NodesPatch, NodesQuery, NodesService } from './nodes.class'

export type { Nodes, NodesData, NodesPatch, NodesQuery }

export type NodesClientService = Pick<NodesService<Params<NodesQuery>>, (typeof nodesMethods)[number]>

export const nodesPath = 'nodes'

export const nodesMethods: Array<keyof NodesService> = ['find', 'get', 'create', 'patch', 'remove']

export const nodesClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(nodesPath, connection.service(nodesPath), {
    methods: nodesMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [nodesPath]: NodesClientService
  }
}
