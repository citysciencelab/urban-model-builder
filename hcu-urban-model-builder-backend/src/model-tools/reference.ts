import { NodeType } from '../client.js'
import { NODE_DATA_FIELDS, NODE_TYPE_NAMES } from './graph-format.js'

const NODE_TYPE_PURPOSE: Partial<Record<NodeType, string>> = {
  [NodeType.Stock]: 'Accumulates a quantity over time. Changed only by flows.',
  [NodeType.Flow]: 'Moves a quantity into or out of stocks at a rate per time unit.',
  [NodeType.Variable]: 'A constant or an equation computed from other nodes.',
  [NodeType.Converter]: 'A lookup table. Its input is the single node linked to it, or the time if none is.',
  [NodeType.State]: 'A boolean condition of an agent or of the model, changed by transitions.',
  [NodeType.Transition]: 'Moves activity from one state to another when its trigger fires.',
  [NodeType.Action]: 'Executes an equation when its trigger fires.',
  [NodeType.Agent]:
    'Container that defines one kind of agent. Put its states, transitions and other nodes inside.',
  [NodeType.Population]: 'A collection of agents of the agent definition connected to it.',
  [NodeType.Folder]: 'Container that only groups nodes visually.',
  [NodeType.OgcApiFeatures]:
    'Loads features from a geodata service (OGC API Features) when the model runs. Its value is a vector that other nodes use in their equations.'
}

/** Reference text for language models: how a model is built from nodes and edges. */
export function getModelingReference() {
  const nodeTypes = Object.entries(NODE_DATA_FIELDS)
    .map(([type, fields]) => {
      const nodeType = Number(type) as NodeType
      const fieldLines = Object.entries(fields).map(
        ([name, field]) => `  - data.${name}: ${field.description}`
      )
      return [`- ${NODE_TYPE_NAMES[nodeType]}: ${NODE_TYPE_PURPOSE[nodeType] ?? ''}`, ...fieldLines].join(
        '\n'
      )
    })
    .join('\n')

  return `# Building models in the Urban Model Builder

A model version is a graph of nodes and edges. It supports system dynamics (stocks and flows) and agent-based
modelling (agents with states, transitions and actions, instantiated by populations). Only draft versions can be
edited; a published version needs a new draft first.

## Node types and their data fields
${nodeTypes}

Read-only node type: "ghost" (a second visual copy of a node, edges on it count for the original).

## Geodata
An ogc-api-features node brings real-world data into a model, for example from the Urban Data Platform Hamburg.
Find data with list_ogc_datasets, list_ogc_collections and describe_ogc_collection, then create the node with
apiId, collectionId, the properties to load (query.properties) and a dataTransform. Load only the properties
you need. The node's value is a vector; use it in other nodes like any node, by name: with a keyProperty and one
value property, [Districts]{"Altona"} selects one value; Sum([Districts]), Mean([Districts]), Max([Districts])
and [Districts].Length() work on all values. The data is loaded anew on every run, so the model follows the
source. Only services enabled on this server can be used.

## Edge types
- link: makes the source available in the equations of the target. Needed for every [Name] reference.
  apply_graph_patch creates missing links automatically unless autoLink is false.
- flow: connects a flow node with stocks. "stock -> flow" makes the stock the start (it is drained),
  "flow -> stock" makes the stock the end (it is filled). A flow has at most one start and one end; a missing
  side is a source or sink outside the model. A flow can use its start and end stock in its rate without a link.
- transition: like flow, but connects a transition node with states: "state -> transition -> state".
- agent-population: "agent -> population", defines which agents the population consists of.

## Equations
Equations are strings in Insight Maker syntax. Other nodes are referenced by name in square brackets, for example
"[Population] * [Birth Rate]". Names are therefore best unique and must not contain square brackets. Typical
functions are IfThenElse(condition, a, b), Min, Max, Round, Rand(), Delay([Node], time), Smooth([Node], time),
Step(start, height), Pulse(time, height, width) and Ramp(start, finish, height); Years(), Months() etc. return the
current time. Numbers can carry units in curly braces, for example {5 Years}; if you use units, set data.units
consistently, otherwise leave them out everywhere.

## Parameters and outputs
- isParameter with parameterMin and parameterMax exposes a stock, variable, flow, state, transition or population as
  an input slider. Its value can then be overridden per simulation run.
- isOutputParameter decides whether the values of a node appear in simulation results. It defaults to true for
  stocks, flows, variables, converters, states and populations created with apply_graph_patch.

## Workflow
1. create_model, or get_model and get_model_version for an existing model.
2. update_simulation_settings for time units, start, length and step.
3. If the model should use real-world data, find it with the geodata tools first.
4. apply_graph_patch with all nodes and edges of a change in one call. Give new nodes a "ref" and use it in
   "parent", "source" and "target". Omit positions; the layout is automatic.
5. validate_model, then simulate, and correct the model based on the results.
`
}
