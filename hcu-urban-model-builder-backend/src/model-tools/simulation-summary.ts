import { NodeType } from '../client.js'
import type { Nodes } from '../services/nodes/nodes.schema.js'
import { NODE_TYPE_NAMES } from './graph-format.js'

type SimulationResult = {
  times: number[]
  nodes: Record<string, { series: unknown[] }>
}

/** Indices of at most `maxPoints` evenly spread entries, always including the first and the last one. */
export function sampleIndices(length: number, maxPoints: number): number[] {
  if (length <= maxPoints) {
    return Array.from({ length }, (_, index) => index)
  }
  if (maxPoints <= 1) {
    return [length - 1]
  }
  const indices = new Set<number>()
  for (let point = 0; point < maxPoints; point++) {
    indices.add(Math.round((point * (length - 1)) / (maxPoints - 1)))
  }
  return [...indices]
}

const round = (value: number) => (Number.isFinite(value) ? Number(value.toPrecision(6)) : value)

/**
 * Reduces a simulation result to what a language model can use: per recorded node a few statistics and a
 * sample of the series, instead of every time step.
 */
export function summarizeSimulation(result: SimulationResult, nodes: Nodes[], maxPoints: number) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const indices = sampleIndices(result.times.length, maxPoints)

  const series = Object.entries(result.nodes).map(([nodeId, { series }]) => {
    const node = nodesById.get(nodeId)
    const base = { nodeId, name: node?.name, type: node ? NODE_TYPE_NAMES[node.type] : undefined }

    if (series.every((value) => typeof value === 'number')) {
      const values = series as number[]
      return {
        ...base,
        first: round(values[0]),
        last: round(values[values.length - 1]),
        min: round(Math.min(...values)),
        max: round(Math.max(...values)),
        mean: round(values.reduce((sum, value) => sum + value, 0) / values.length),
        values: indices.map((index) => round(values[index]))
      }
    }

    if (node?.type === NodeType.Population) {
      // per sampled time step: how many agents are in which state
      const agents = series as { state: string[] }[][]
      return {
        ...base,
        agentCount: agents[0]?.length ?? 0,
        stateCounts: indices.map((index) => {
          const counts: Record<string, number> = {}
          for (const agent of agents[index] ?? []) {
            for (const stateId of agent.state ?? []) {
              const stateName = nodesById.get(stateId)?.name ?? stateId
              counts[stateName] = (counts[stateName] ?? 0) + 1
            }
          }
          return counts
        })
      }
    }

    // vectors and other structured values: the sampled raw values
    return { ...base, values: indices.map((index) => series[index]) }
  })

  return {
    steps: result.times.length,
    sampledTimes: indices.map((index) => round(result.times[index])),
    series,
    ...(series.length === 0
      ? { hint: 'No node records its values. Set isOutputParameter to true on the nodes you want to see.' }
      : {})
  }
}
