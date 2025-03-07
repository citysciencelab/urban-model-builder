declare module 'simulation' {
  import type { ModelNode } from 'simulation/ModelNode'
  import type {
    ActionConfig,
    AgentConfig,
    ContainerConfig,
    ConverterConfig,
    FlowConfig,
    FolderConfig,
    LinkConfig,
    PopulationConfig,
    Primitive,
    PrimitiveConfig,
    StateConfig,
    StockConfig,
    TransitionConfig,
    ValuedConfig,
    VariableConfig
  } from 'simulation/blocks'
  import type { Results } from 'simulation/Results'
  import type { Stock } from 'simulation/blocks'
  import type { Variable } from 'simulation/blocks'
  import type { Converter } from 'simulation/blocks'
  import type { State } from 'simulation/blocks'
  import type { Action } from 'simulation/blocks'
  import type { Population } from 'simulation/blocks'
  import type { Flow } from 'simulation/blocks'
  import type { Transition } from 'simulation/blocks'
  import type { Link } from 'simulation/blocks'
  import type { Agent } from 'simulation/blocks'
  import type { Folder } from 'simulation/blocks'
  import type {} from 'simulation/types'

  export function loadInsightMaker(xml: string): Model
  export function removeModelGhosts(model: Model): void
  export class Model {
    constructor(config?: ModelConfig | undefined)
    _graph: ModelNode
    settings: ModelNode
    p: Function
    _createNode(type: string): ModelNode
    _createConnector(type: string, alpha: Primitive, omega: Primitive): ModelNode
    simulate(): Results
    Stock(config?: PrimitiveConfig & ValuedConfig & StockConfig): Stock
    Variable(config?: PrimitiveConfig & ValuedConfig & VariableConfig): Variable
    Converter(config?: PrimitiveConfig & ValuedConfig & ConverterConfig): Converter
    State(config?: PrimitiveConfig & StateConfig): State
    Action(config?: PrimitiveConfig & ActionConfig): Action
    Population(config?: PrimitiveConfig & PopulationConfig): Population
    Flow(
      start: Stock | null,
      end: Stock | null,
      config?: (PrimitiveConfig & ValuedConfig & FlowConfig) | undefined
    ): Flow
    Transition(
      start: State | null,
      end: State | null,
      config?: (PrimitiveConfig & ValuedConfig & TransitionConfig) | undefined
    ): Transition
    Link(start: Primitive, end: Primitive, config?: (PrimitiveConfig & LinkConfig) | undefined): Link
    Agent(config?: PrimitiveConfig & ContainerConfig & AgentConfig): Agent
    Folder(config?: PrimitiveConfig & ContainerConfig & FolderConfig): Folder
    getId(id: string): Primitive
    get(selector: (arg0: Primitive) => boolean): Primitive
    getLink(selector: (arg0: Link) => boolean): Link
    getFlow(selector: (arg0: Flow) => boolean): Flow
    getTransition(selector: (arg0: Transition) => boolean): Transition
    getStock(selector: (arg0: Stock) => boolean): Stock
    getVariable(selector: (arg0: Variable) => boolean): Variable
    getConverter(selector: (arg0: Converter) => boolean): Converter
    getState(selector: (arg0: State) => boolean): State
    getAction(selector: (arg0: Action) => boolean): Action
    getPopulation(selector: (arg0: Population) => boolean): Population
    getFolder(selector: (arg0: Folder) => boolean): Folder
    getAgent(selector: (arg0: Agent) => boolean): Agent
    find(selector?: ((arg0: Primitive) => boolean) | undefined): Primitive[]
    findLinks(selector?: ((arg0: Link) => boolean) | undefined): Link[]
    findFlows(selector?: ((arg0: Flow) => boolean) | undefined): Flow[]
    findTransitions(selector?: ((arg0: Transition) => boolean) | undefined): Transition[]
    findStocks(selector?: ((arg0: Stock) => boolean) | undefined): Stock[]
    findVariables(selector?: ((arg0: Variable) => boolean) | undefined): Variable[]
    findConverters(selector?: ((arg0: Converter) => boolean) | undefined): Converter[]
    findStates(selector?: ((arg0: State) => boolean) | undefined): State[]
    findActions(selector?: ((arg0: Action) => boolean) | undefined): Action[]
    findPopulations(selector?: ((arg0: Population) => boolean) | undefined): Population[]
    findFolders(selector?: ((arg0: Folder) => boolean) | undefined): Folder[]
    findAgents(selector?: ((arg0: Agent) => boolean) | undefined): Agent[]
    set timeStart(value: number)
    get timeStart(): number
    set timeLength(value: number)
    get timeLength(): number
    set timePause(value: number)
    get timePause(): number
    set timeStep(value: number)
    get timeStep(): number
    set timeUnits(value: 'Years' | 'Seconds' | 'Minutes' | 'Hours' | 'Days' | 'Weeks' | 'Months')
    get timeUnits(): 'Years' | 'Seconds' | 'Minutes' | 'Hours' | 'Days' | 'Weeks' | 'Months'
    set algorithm(value: AlgorithmType)
    get algorithm(): AlgorithmType
    set globals(value: string)
    get globals(): string
    set customUnits(value: CustomUnitsType)
    get customUnits(): CustomUnitsType
  }
  export type CustomUnitsType = {
    name: string
    target: string
    scale: number
  }[]
  export type AlgorithmType = 'Euler' | 'RK4'
  export type ModelConfig = {
    primitiveFn?: Function | undefined
    timeStart?: number | undefined
    timeLength?: number | undefined
    timeStep?: number | undefined
    timePause?: number | undefined
    algorithm?: AlgorithmType | undefined
    timeUnits?: ('Seconds' | 'Minutes' | 'Hours' | 'Days' | 'Weeks' | 'Months' | 'Years') | undefined
  }
}
