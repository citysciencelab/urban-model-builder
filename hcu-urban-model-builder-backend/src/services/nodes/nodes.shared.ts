// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client.js'
import type { Nodes, NodesData, NodesPatch, NodesQuery, NodesService } from './nodes.class.js'

export { Nodes, NodesData, NodesPatch, NodesQuery }

export enum NodeType {
  Stock = 0,
  Variable = 1,
  Flow = 2,
  Converter = 3,
  State = 4,
  Transition = 5,
  Action = 6,
  Population = 7,
  Agent = 8,
  Folder = 9,
  Ghost = 10,
  OgcApiFeatures = 11
}

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
declare module '../../client.js' {
  interface ServiceTypes {
    [nodesPath]: NodesClientService
  }
}
