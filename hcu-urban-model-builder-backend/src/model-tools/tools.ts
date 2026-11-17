import { Type } from '@feathersjs/typebox'
import { NodeType, Roles } from '../client.js'
import type { Nodes } from '../services/nodes/nodes.schema.js'
import { resolveOgcEndpoint } from '../shared/simulation-adapter/ogc-endpoints.js'
import { NODE_TYPE_TO_PARAMETER_NAME_MAP } from '../shared/simulation-adapter/simulation-adapter.js'
import { Literals } from '../utils/schema.js'
import { getEditableVersion, getReadableVersion, loadGraph, userParams } from './access.js'
import { executeBatch, type BatchOperation } from './batch.js'
import { applyGraphPatch, graphPatchSchema } from './graph-patch.js'
import {
  ARROW_NODE_TYPES,
  NODE_TYPE_NAMES,
  serializeEdge,
  serializeNode,
  serializeVersion
} from './graph-format.js'
import { arrowDirection, computeLayout, edgeHandles, type LayoutNode } from './layout.js'
import { isAllowedOgcUrl, ogcTools } from './ogc.js'
import { getModelingReference } from './reference.js'
import { runSimulation } from './simulation-runner.js'
import { summarizeSimulation } from '../shared/simulation-summary.js'
import { defineTool, ToolError, type ToolContext, type ToolDefinition } from './types.js'
import { validateGraph } from './validate.js'

const uuid = (description: string) => Type.String({ format: 'uuid', description })
const object = <T extends Record<string, any>>(properties: T) =>
  Type.Object(properties, { additionalProperties: false })

async function getModel(ctx: ToolContext, modelId: string) {
  try {
    return await ctx.app.service('models').get(modelId, userParams(ctx))
  } catch (error: any) {
    if (error?.code === 404) {
      throw new ToolError('not_found', `Model ${modelId} does not exist or is not accessible.`)
    }
    throw error
  }
}

const listModels = defineTool({
  name: 'list_models',
  description:
    'Lists models: the models the user owns or collaborates on (scope "mine", default) or the published models of all users (scope "public").',
  readOnly: true,
  inputSchema: object({
    scope: Type.Optional(Literals('mine', 'public')),
    search: Type.Optional(Type.String({ description: 'Part of the model name, case-insensitive.' })),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 50 }))
  }),
  handler: async (ctx, input) => {
    const query: Record<string, unknown> = { $limit: input.limit ?? 50 }
    query[input.scope === 'public' ? '$public' : '$me'] = true
    if (input.search) {
      // % and _ are wildcards of ILIKE and have to be matched literally
      query.internalName = { $ilike: `%${input.search.replace(/[\\%_]/g, '\\$&')}%` }
    }
    const result = await ctx.app.service('models').find(userParams(ctx, { query }))
    return {
      total: result.total,
      models: result.data.map((model) => ({
        id: model.id,
        name: model.internalName,
        description: model.description ?? undefined,
        role: Roles[model.role ?? 0],
        latestDraftVersionId: model.latestDraftVersionId ?? undefined,
        latestPublishedVersionId: model.latestPublishedVersionId ?? undefined,
        updatedAt: model.updatedAt ?? model.createdAt
      }))
    }
  }
})

const getModelTool = defineTool({
  name: 'get_model',
  description:
    'Returns a model with the list of its versions. Use it to find the id of the latest draft version, which is the only editable one.',
  readOnly: true,
  inputSchema: object({ modelId: uuid('Id of the model.') }),
  handler: async (ctx, input) => {
    const model = await getModel(ctx, input.modelId)
    const versions = await ctx.app
      .service('models-versions')
      .find(userParams(ctx, { query: { modelId: model.id, $limit: 200 } }))
    return {
      id: model.id,
      name: model.internalName,
      description: model.description ?? undefined,
      role: Roles[model.role ?? 0],
      latestDraftVersionId: model.latestDraftVersionId ?? undefined,
      latestPublishedVersionId: model.latestPublishedVersionId ?? undefined,
      versions: versions.data
        .map(serializeVersion)
        .map(({ settings, ...version }) => version)
        .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))
    }
  }
})

const getModelVersion = defineTool({
  name: 'get_model_version',
  description:
    'Returns one version of a model with its simulation settings and its complete graph (nodes and edges). Call this before changing a model.',
  readOnly: true,
  inputSchema: object({ modelVersionId: uuid('Id of the model version.') }),
  handler: async (ctx, input) => {
    const version = await getReadableVersion(ctx, input.modelVersionId)
    const { nodes, edges } = await loadGraph(ctx, version.id)
    return {
      ...serializeVersion(version),
      nodes: nodes.map(serializeNode),
      edges: edges.map(serializeEdge)
    }
  }
})

const getModelingReferenceTool = defineTool({
  name: 'get_modeling_reference',
  description:
    'Returns the reference for building models: node types with their data fields, edge types, equation syntax and the recommended workflow. Read it once before the first apply_graph_patch.',
  readOnly: true,
  inputSchema: object({}),
  handler: async () => ({ reference: getModelingReference() })
})

const createModel = defineTool({
  name: 'create_model',
  description:
    'Creates a new, empty model owned by the user and returns the id of its first draft version, which can be edited right away.',
  readOnly: false,
  inputSchema: object({
    name: Type.String({ minLength: 1, maxLength: 200 }),
    description: Type.Optional(Type.String())
  }),
  handler: async (ctx, input) => {
    const created = await ctx.app
      .service('models')
      .create({ internalName: input.name, description: input.description ?? null } as any, userParams(ctx))
    // the first draft version is created by a hook after the model, so the model is read again
    const model = await getModel(ctx, created.id)
    return { modelId: model.id, name: model.internalName, modelVersionId: model.latestDraftVersionId }
  }
})

const updateSimulationSettings = defineTool({
  name: 'update_simulation_settings',
  description:
    'Changes the simulation settings of a draft version: time units, start, length, step, algorithm and global equations. Only the given fields are changed.',
  readOnly: false,
  inputSchema: object({
    modelVersionId: uuid('Id of the draft version.'),
    timeUnits: Type.Optional(Literals('Seconds', 'Minutes', 'Hours', 'Days', 'Weeks', 'Months', 'Years')),
    timeStart: Type.Optional(Type.Number()),
    timeLength: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
    timeStep: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
    algorithm: Type.Optional(Literals('Euler', 'RK4')),
    globals: Type.Optional(Type.String({ description: 'Global equations, for example macro definitions.' }))
  }),
  handler: async (ctx, { modelVersionId, ...settings }) => {
    await getEditableVersion(ctx, modelVersionId)
    if (Object.keys(settings).length === 0) {
      throw new ToolError('invalid_input', 'Give at least one setting to change.')
    }
    const version = await ctx.app.service('models-versions').patch(modelVersionId, settings, userParams(ctx))
    return serializeVersion({ ...version, role: version.role ?? Roles.collaborator })
  }
})

const applyGraphPatchTool = defineTool({
  name: 'apply_graph_patch',
  description:
    'Creates, changes and deletes nodes and edges of a draft version in one step. Either the whole patch is applied or nothing. New nodes are arranged automatically and missing links for [Name] references are added. Returns the ids of the created nodes and edges and the remaining issues of the model.',
  readOnly: false,
  inputSchema: graphPatchSchema,
  handler: applyGraphPatch
})

const autoLayout = defineTool({
  name: 'auto_layout',
  description:
    'Rearranges all nodes of a draft version automatically. This discards the manual arrangement made by users, so only use it when asked or for models you built yourself.',
  readOnly: false,
  inputSchema: object({ modelVersionId: uuid('Id of the draft version.') }),
  handler: async (ctx, input) => {
    const version = await getEditableVersion(ctx, input.modelVersionId)
    const { nodes, edges } = await loadGraph(ctx, version.id)
    const layoutNodes = new Map(
      nodes.map((node) => [node.id, structuredClone(node) as unknown as LayoutNode])
    )

    const changes = computeLayout([...layoutNodes.values()], edges, new Set(layoutNodes.keys()))
    const patches = new Map<string, Record<string, unknown>>([...changes])
    for (const [id, change] of changes) {
      Object.assign(layoutNodes.get(id)!, change)
    }
    for (const node of layoutNodes.values()) {
      const direction = ARROW_NODE_TYPES.includes(node.type) && arrowDirection(node, edges, layoutNodes)
      if (direction && direction !== node.data.direction) {
        node.data = { ...node.data, direction }
        patches.set(node.id, { ...patches.get(node.id), data: node.data })
      }
    }

    const operations: BatchOperation[] = [
      ...[...patches].map(([id, data]) => ({
        service: 'nodes' as const,
        method: 'patch' as const,
        id,
        data: () => data
      })),
      ...edges.map((edge) => ({
        service: 'edges' as const,
        method: 'patch' as const,
        id: edge.id,
        // manually bent edges would not fit the new arrangement
        data: () => ({ ...edgeHandles(edge, layoutNodes), points: null })
      }))
    ]
    await executeBatch(ctx.app, operations)
    return { arrangedNodes: patches.size, updatedEdges: edges.length }
  }
})

const validateModel = defineTool({
  name: 'validate_model',
  description:
    'Checks a model version for common problems without running it: missing names, equations that reference unknown or unlinked nodes, unconnected flows and similar. Use it before simulate.',
  readOnly: true,
  inputSchema: object({ modelVersionId: uuid('Id of the model version.') }),
  handler: async (ctx, input) => {
    const version = await getReadableVersion(ctx, input.modelVersionId)
    const { nodes, edges } = await loadGraph(ctx, version.id)
    const issues = validateGraph(nodes, edges)
    return {
      valid: !issues.some((issue) => issue.severity === 'error'),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      issues
    }
  }
})

/**
 * Simulating a model with OGC API Features nodes makes the server request the configured service. A tool only
 * starts such a simulation if every service is on the server's allowlist.
 */
function assertOgcEndpointsAllowed(
  ctx: ToolContext,
  nodes: Nodes[],
  ogcEndpoints: Parameters<typeof resolveOgcEndpoint>[1]
) {
  for (const node of nodes.filter((node) => node.type === NodeType.OgcApiFeatures)) {
    const { baseUrl } = resolveOgcEndpoint(node.data, ogcEndpoints)
    if (!isAllowedOgcUrl(ctx.app, baseUrl)) {
      throw new ToolError(
        'forbidden',
        `The node "${node.name}" loads data from ${baseUrl}, which is not enabled for assistants on this server. Run this model in the editor instead.`
      )
    }
  }
}

const simulate = defineTool({
  name: 'simulate',
  description:
    'Runs a model version and returns, for every node that records its values, statistics (first, last, min, max, mean) and a sample of the time series. Parameter values can be overridden for this run only.',
  readOnly: true,
  inputSchema: object({
    modelVersionId: uuid('Id of the model version.'),
    parameterValues: Type.Optional(
      Type.Record(Type.String(), Type.Number(), {
        description:
          'Values for this run, keyed by node id. Applies to stocks, variables, flows, states, transitions and populations.'
      })
    ),
    maxPoints: Type.Optional(
      Type.Integer({
        minimum: 2,
        maximum: 500,
        default: 25,
        description: 'Number of sampled time steps per series.'
      })
    )
  }),
  handler: async (ctx, input) => {
    const version = await getReadableVersion(ctx, input.modelVersionId)
    const { nodes, edges } = await loadGraph(ctx, version.id)
    const nodesById = new Map(nodes.map((node) => [node.id, node]))
    const parameterValues = input.parameterValues ?? {}
    const maxPoints = input.maxPoints ?? 25

    for (const nodeId of Object.keys(parameterValues)) {
      const node = nodesById.get(nodeId)
      if (!node) {
        throw new ToolError(
          'invalid_input',
          `parameterValues: node ${nodeId} does not exist in this model version.`
        )
      }
      if (!(node.type in NODE_TYPE_TO_PARAMETER_NAME_MAP)) {
        throw new ToolError(
          'invalid_input',
          `parameterValues: the value of the ${NODE_TYPE_NAMES[node.type]} "${node.name}" cannot be overridden.`
        )
      }
    }

    let summary
    try {
      if (ctx.simulator) {
        // In the user's browser, as the simulations of the editor: the server neither computes nor loads
        // geodata, so the allowlist of geodata hosts does not apply.
        summary = await ctx.simulator({ modelVersionId: version.id, parameterValues, maxPoints })
      } else {
        // The server requests the geodata itself here, so only allowed hosts
        assertOgcEndpointsAllowed(ctx, nodes, version.ogcEndpoints)
        // in a thread of its own: access was checked above, the thread only gets the graph
        const result = await runSimulation(ctx.app, { version, nodes, edges, parameterValues })
        summary = summarizeSimulation(result, nodes, maxPoints)
      }
    } catch (error) {
      if (error instanceof ToolError && error.code === 'simulation_failed') {
        const nodeId = (error.details as { nodeId?: string } | undefined)?.nodeId
        error.details = { nodeId, nodeName: nodeId ? nodesById.get(nodeId)?.name : undefined }
      }
      throw error
    }

    return { timeUnits: version.timeUnits, ...summary }
  }
})

const newDraft = defineTool({
  name: 'new_draft',
  description:
    'Creates a new draft version of a model as a copy of its latest version and returns it. Needed to edit a model whose latest version is published; the previous version stays unchanged.',
  readOnly: false,
  inputSchema: object({ modelId: uuid('Id of the model.') }),
  handler: async (ctx, input) => {
    await getModel(ctx, input.modelId)
    const version = await ctx.app.service('models').newDraft({ id: input.modelId }, userParams(ctx))
    return serializeVersion(await getReadableVersion(ctx, version.id))
  }
})

const cloneModelVersion = defineTool({
  name: 'clone_model_version',
  description:
    'Copies a model version into a new model owned by the user and returns the draft version of the copy. Use it to experiment without touching the original, or as a backup before larger changes.',
  readOnly: false,
  inputSchema: object({
    modelVersionId: uuid('Id of the version to copy.'),
    name: Type.String({ minLength: 1, maxLength: 200, description: 'Name of the new model.' })
  }),
  handler: async (ctx, input) => {
    await getReadableVersion(ctx, input.modelVersionId)
    const version = await ctx.app
      .service('models')
      .cloneVersion({ id: input.modelVersionId, internalName: input.name }, userParams(ctx))
    return serializeVersion(await getReadableVersion(ctx, version.id))
  }
})

export const tools = [
  listModels,
  getModelTool,
  getModelVersion,
  getModelingReferenceTool,
  createModel,
  updateSimulationSettings,
  applyGraphPatchTool,
  autoLayout,
  validateModel,
  simulate,
  newDraft,
  cloneModelVersion,
  ...ogcTools
] as unknown as ToolDefinition[]
