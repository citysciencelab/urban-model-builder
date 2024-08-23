// For more information about this file see https://dove.feathersjs.com/guides/cli/client.html
import { feathers } from '@feathersjs/feathers'
import type { TransportConnection, Application } from '@feathersjs/feathers'
import authenticationClient from '@feathersjs/authentication-client'
import type { AuthenticationClientOptions } from '@feathersjs/authentication-client'

import { simulateClient } from './services/simulate/simulate.shared'
export type {
  Simulate,
  SimulateData,
  SimulateQuery,
  SimulatePatch
} from './services/simulate/simulate.shared'

import { edgesClient } from './services/edges/edges.shared'
export type { Edges, EdgesData, EdgesQuery, EdgesPatch } from './services/edges/edges.shared'

import { nodesClient } from './services/nodes/nodes.shared'
export type { Nodes, NodesData, NodesQuery, NodesPatch } from './services/nodes/nodes.shared'
import { NodeType } from './services/nodes/nodes.shared'
export { NodeType }

export interface Configuration {
  connection: TransportConnection<ServiceTypes>
}

export interface ServiceTypes { }

export type ClientApplication = Application<ServiceTypes, Configuration>

/**
 * Returns a typed client for the hcu-urban-model-builder-backend app.
 *
 * @param connection The REST or Socket.io Feathers client connection
 * @param authenticationOptions Additional settings for the authentication client
 * @see https://dove.feathersjs.com/api/client.html
 * @returns The Feathers client application
 */
export const createClient = <Configuration = any,>(
  connection: TransportConnection<ServiceTypes>,
  authenticationOptions: Partial<AuthenticationClientOptions> = {}
) => {
  const client: ClientApplication = feathers()

  client.configure(connection)
  client.configure(authenticationClient(authenticationOptions))
  client.set('connection', connection)

  client.configure(nodesClient)
  client.configure(nodesClient)
  client.configure(edgesClient)
  client.configure(simulateClient)
  return client
}
