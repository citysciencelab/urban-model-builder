import type { Params } from '@feathersjs/feathers'
import { Roles } from '../client.js'
import type { ModelsVersions } from '../services/models-versions/models-versions.schema.js'
import type { Nodes } from '../services/nodes/nodes.schema.js'
import type { Edges } from '../services/edges/edges.schema.js'
import { ToolError, type ToolContext } from './types.js'

/**
 * Provider name of service calls made on behalf of a user. Any provider makes a call "external" for the
 * existing hooks, so permission filters and permission checks apply exactly as for REST and Socket.IO.
 */
export const MODEL_TOOLS_PROVIDER = 'model-tools'

/** Params for a service call that must be subject to the user's permissions. */
export const userParams = (ctx: ToolContext, extra: Params = {}): Params => ({
  ...extra,
  user: ctx.user,
  provider: MODEL_TOOLS_PROVIDER,
  authenticated: true
})

/** Loads a model version the user may read (member of the model, or the version is published). */
export async function getReadableVersion(ctx: ToolContext, modelVersionId: string): Promise<ModelsVersions> {
  try {
    return await ctx.app.service('models-versions').get(modelVersionId, userParams(ctx))
  } catch (error: any) {
    if (error?.code === 404) {
      throw new ToolError('not_found', `Model version ${modelVersionId} does not exist or is not accessible.`)
    }
    throw error
  }
}

/** Loads a model version and ensures the user may edit its graph: collaborator or higher, draft, latest. */
export async function getEditableVersion(ctx: ToolContext, modelVersionId: string): Promise<ModelsVersions> {
  const version = await getReadableVersion(ctx, modelVersionId)

  if (version.role == null || version.role < Roles.collaborator) {
    throw new ToolError('forbidden', 'You need to be at least a collaborator of this model to edit it.')
  }
  if (version.publishedAt != null) {
    throw new ToolError(
      'conflict',
      'This model version is published and read-only. Create a new draft with new_draft and edit that one.'
    )
  }
  if (!version.isLatest) {
    throw new ToolError(
      'conflict',
      'This model version is not the latest one. Use get_model to find the latest draft version.'
    )
  }
  return version
}

/**
 * Loads the graph of a version. Callers must have checked access to the version before, because these are
 * internal calls without a permission filter.
 */
export async function loadGraph(
  ctx: ToolContext,
  modelVersionId: string
): Promise<{ nodes: Nodes[]; edges: Edges[] }> {
  const [nodes, edges] = await Promise.all([
    ctx.app.service('nodes').find({ query: { modelsVersionsId: modelVersionId }, paginate: false }),
    ctx.app.service('edges').find({ query: { modelsVersionsId: modelVersionId }, paginate: false })
  ])
  return { nodes: nodes as unknown as Nodes[], edges: edges as unknown as Edges[] }
}
