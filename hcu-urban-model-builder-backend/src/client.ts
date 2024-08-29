// For more information about this file see https://dove.feathersjs.com/guides/cli/client.html
import { feathers } from '@feathersjs/feathers'
import type { TransportConnection, Application } from '@feathersjs/feathers'
import authenticationClientModule from '@feathersjs/authentication-client'
// temporary workaround for https://github.com/feathersjs/feathers/issues/3343
const authenticationClient =
  authenticationClientModule as unknown as typeof authenticationClientModule.default
import type { AuthenticationClientOptions } from '@feathersjs/authentication-client'

import { modelsClient } from './services/models/models.shared.js'
export type { Models, ModelsData, ModelsQuery, ModelsPatch } from './services/models/models.shared.js'

import { simulateClient } from './services/simulate/simulate.shared.js'
export type {
  Simulate,
  SimulateData,
  SimulateQuery,
  SimulatePatch
} from './services/simulate/simulate.shared.js'

import { edgesClient, EdgeType } from './services/edges/edges.shared.js'
export type { Edges, EdgesData, EdgesQuery, EdgesPatch } from './services/edges/edges.shared.js'
export { EdgeType }

import { nodesClient, NodeType } from './services/nodes/nodes.shared.js'
export type { Nodes, NodesData, NodesQuery, NodesPatch } from './services/nodes/nodes.shared.js'
export { NodeType }

export interface Configuration {
  connection: TransportConnection<ServiceTypes>
}

export interface ServiceTypes {}

export type ClientApplication = Application<ServiceTypes, Configuration>

/**
 * Returns a typed client for the hcu-urban-model-builder-backend app.
 *
 * @param connection The REST or Socket.io Feathers client connection
 * @param authenticationOptions Additional settings for the authentication client
 * @see https://dove.feathersjs.com/api/client.html
 * @returns The Feathers client application
 */
export const createClient = <Configuration = any>(
  connection: TransportConnection<ServiceTypes>,
  authenticationOptions: Partial<AuthenticationClientOptions> = {}
) => {
  const client: ClientApplication = feathers()

  client.configure(connection)
  client.configure(authenticationClient(authenticationOptions))
  client.set('connection', connection)

  client.configure(nodesClient)
  client.configure(edgesClient)
  client.configure(simulateClient)
  client.configure(modelsClient)
  return client
}
