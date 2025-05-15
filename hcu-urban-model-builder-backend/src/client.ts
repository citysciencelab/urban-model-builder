// For more information about this file see https://dove.feathersjs.com/guides/cli/client.html
import { feathers } from '@feathersjs/feathers'
import type { TransportConnection, Application } from '@feathersjs/feathers'
import authenticationClientModule from '@feathersjs/authentication-client'
// temporary workaround for https://github.com/feathersjs/feathers/issues/3343
const authenticationClient =
  authenticationClientModule as unknown as typeof authenticationClientModule.default
import type { AuthenticationClientOptions } from '@feathersjs/authentication-client'

import { adminPublicModelVersionsUnapproveClient } from './services/admin/public-model-versions/unapprove/unapprove.shared.js'
export type {
  AdminPublicModelVersionsUnapprove,
  AdminPublicModelVersionsUnapproveQuery,
  AdminPublicModelVersionsUnapprovePatch
} from './services/admin/public-model-versions/unapprove/unapprove.shared.js'

import { adminPublicModelVersionsApproveClient } from './services/admin/public-model-versions/approve/approve.shared.js'
export type {
  AdminPublicModelVersionsApprove,
  AdminPublicModelVersionsApproveQuery,
  AdminPublicModelVersionsApprovePatch
} from './services/admin/public-model-versions/approve/approve.shared.js'

import { adminPublicModelVersionsClient } from './services/admin/public-model-versions/public-model-versions.shared.js'
export type {
  AdminPublicModelVersions,
  AdminPublicModelVersionsQuery
} from './services/admin/public-model-versions/public-model-versions.shared.js'

import { scenarioValuesClient } from './services/scenarios-values/scenarios-values.shared.js'
export type {
  ScenarioValues,
  ScenarioValuesData,
  ScenarioValuesQuery,
  ScenarioValuesPatch
} from './services/scenarios-values/scenarios-values.shared.js'

import { scenariosClient } from './services/scenarios/scenarios.shared.js'
export type {
  Scenarios,
  ScenariosData,
  ScenariosQuery,
  ScenariosPatch
} from './services/scenarios/scenarios.shared.js'

import { modelsUsersClient } from './services/models-users/models-users.shared.js'
export type {
  ModelsUsers,
  ModelsUsersData,
  ModelsUsersQuery,
  ModelsUsersPatch
} from './services/models-users/models-users.shared.js'

import { modelsVersionsClient } from './services/models-versions/models-versions.shared.js'
export type {
  ModelsVersions,
  ModelsVersionsData,
  ModelsVersionsQuery,
  ModelsVersionsPatch
} from './services/models-versions/models-versions.shared.js'

import { userClient } from './services/users/users.shared.js'
export type { User, UserData, UserQuery, UserPatch } from './services/users/users.shared.js'

import { modelsClient } from './services/models/models.shared.js'
export type { Models, ModelsData, ModelsQuery, ModelsPatch } from './services/models/models.shared.js'

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

export enum Roles {
  'none' = 0,
  'viewer' = 1,
  'collaborator' = 2,
  'co_owner' = 3,
  'owner' = 4
}

export type ParameterTypes = 'boolean' | 'slider' | 'select'

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
  client.configure(modelsClient)
  client.configure(userClient)
  client.configure(modelsVersionsClient)
  client.configure(modelsUsersClient)
  client.configure(scenariosClient)
  client.configure(scenarioValuesClient)
  client.configure(adminPublicModelVersionsClient)
  client.configure(adminPublicModelVersionsApproveClient)
  client.configure(adminPublicModelVersionsUnapproveClient)
  return client
}

export {
  SimulationAdapter,
  NODE_TYPE_TO_PARAMETER_NAME_MAP
} from './shared/simulation-adapter/simulation-adapter.js'
export { transformFeatures, GEOMETRY_KEY } from './shared/simulation-adapter/utils.js'
export { OgcApiFeaturesClient } from './shared/simulation-adapter/ogc-api-features-client.js'
