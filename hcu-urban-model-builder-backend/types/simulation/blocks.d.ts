declare module 'simulation/blocks' {
  import type { AlgorithmType, Model } from 'simulation'
  import type { ModelNode } from 'simulation/ModelNode'
  import type { NetworkType, PlacementType, StockTypeType, TriggerType } from 'simulation/types'
  export class Primitive {
    constructor(node: ModelNode, config: PrimitiveConfig)
    _node: ModelNode
    model: Model
    delete(): void
    set parent(parent: Container)
    get parent(): Container
    getParent(selector: (arg0: Container) => boolean): Container
    isInAgent(): boolean
    neighbors(): NeighborhoodEntry[]
    get id(): string
    set name(value: string)
    get name(): string
    set note(value: string)
    get note(): string
  }
  export class ValuedPrimitive extends Primitive {
    set units(value: string)
    get units(): string
    set constraints(constraints: { max?: number; min?: number })
    get constraints(): {
      max?: number
      min?: number
    }
    set external(value: boolean)
    get external(): boolean
  }
  export class Stock extends ValuedPrimitive {
    set initial(value: Value)
    get initial(): string
    set type(value: StockTypeType)
    get type(): StockTypeType
    set delay(value: Value)
    get delay(): string
    set nonNegative(value: boolean)
    get nonNegative(): boolean
  }
  export class Variable extends ValuedPrimitive {
    set value(value: Value)
    get value(): string
  }
  export class Converter extends ValuedPrimitive {
    set interpolation(value: 'Linear' | 'Discrete')
    get interpolation(): 'Linear' | 'Discrete'
    set values(
      value: {
        x: number
        y: number
      }[]
    )
    get values(): {
      x: number
      y: number
    }[]
    set input(value: 'Time' | ValuedPrimitive)
    get input(): 'Time' | ValuedPrimitive
  }
  export class Flow extends ValuedPrimitive {
    set rate(value: Value)
    get rate(): string
    set start(node: Stock)
    get start(): Stock
    set end(node: Stock)
    get end(): Stock
    set nonNegative(value: boolean)
    get nonNegative(): boolean
  }
  export class Link extends Primitive {
    set biDirectional(value: any)
    get biDirectional(): any
    set start(node: any)
    get start(): any
    set end(node: any)
    get end(): any
  }
  export class State extends ValuedPrimitive {
    set startActive(value: string | boolean)
    get startActive(): string | boolean
    set residency(value: Value)
    get residency(): string
  }
  export class Transition extends ValuedPrimitive {
    set value(value: Value)
    get value(): Value
    set start(node: State)
    get start(): State
    set end(node: State)
    get end(): State
    set recalculate(value: boolean)
    get recalculate(): boolean
    set repeat(value: boolean)
    get repeat(): boolean
    set trigger(value: TriggerType)
    get trigger(): TriggerType
  }
  export class Action extends Primitive {
    set value(value: Value)
    get value(): string
    set action(value: string)
    get action(): string
    set recalculate(value: boolean)
    get recalculate(): boolean
    set repeat(value: boolean)
    get repeat(): boolean
    set trigger(value: TriggerType)
    get trigger(): TriggerType
  }
  export class Population extends Primitive {
    set agentBase(value: Agent)
    get agentBase(): Agent
    set populationSize(value: number)
    get populationSize(): number
    set geoUnits(value: string)
    get geoUnits(): string
    set geoWidth(value: Value)
    get geoWidth(): string
    set geoHeight(value: Value)
    get geoHeight(): string
    set geoWrapAround(value: boolean)
    get geoWrapAround(): boolean
    set geoPlacementType(value: PlacementType)
    get geoPlacementType(): PlacementType
    set geoPlacementFunction(value: string)
    get geoPlacementFunction(): string
    set networkType(value: NetworkType)
    get networkType(): NetworkType
    set networkFunction(value: string)
    get networkFunction(): string
  }
  export class Container extends Primitive {
    children(recursive?: boolean): Primitive[]
    Stock(config?: PrimitiveConfig & ValuedConfig & StockConfig): Stock
    Variable(config?: PrimitiveConfig & ValuedConfig & VariableConfig): Variable
    Converter(config?: PrimitiveConfig & ValuedConfig & ConverterConfig): Converter
    State(config?: PrimitiveConfig & StateConfig): State
    Action(config?: PrimitiveConfig & ActionConfig): Action
    Population(config?: PrimitiveConfig & PopulationConfig): Population
    Flow(start: Stock, end: Stock, config?: (PrimitiveConfig & ValuedConfig & FlowConfig) | undefined): Flow
    Transition(
      start: State,
      end: State,
      config?: (PrimitiveConfig & TransitionConfig) | undefined
    ): Transition
    Link(start: Primitive, end: Primitive, config?: (PrimitiveConfig & LinkConfig) | undefined): Link
    set frozen(value: boolean)
    get frozen(): boolean
    set customTimeSettings(value: { enabled: boolean; algorithm: AlgorithmType; timeStep: number })
    get customTimeSettings(): {
      enabled: boolean
      algorithm: AlgorithmType
      timeStep: number
    }
  }
  export class Folder extends Container {}
  export class Agent extends Container {
    set agentParent(value: string)
    get agentParent(): string
  }
  export type Value = string | number
  export type NeighborhoodEntry = {
    item: Primitive
    type: string
    linkHidden?: boolean | undefined
    name?: string | undefined
  }
  export type PrimitiveConfig = {
    name?: string | undefined
    note?: string | undefined
  }
  export type ValuedConfig = {
    constraints?:
      | {
          max?: number
          min?: number
        }
      | undefined
    units?: string | undefined
    external?: boolean | undefined
  }
  export type StockConfig = {
    initial?: Value | undefined
    type?: StockTypeType | undefined
    nonNegative?: boolean | undefined
    delay?: Value | undefined
  }
  export type VariableConfig = {
    value?: Value | undefined
  }
  export type ConverterConfig = {
    interpolation?: ('Discrete' | 'Linear') | undefined
    input?: ('Time' | ValuedPrimitive) | undefined
    values?:
      | {
          x: number
          y: number
        }[]
      | undefined
  }
  export type FlowConfig = {
    rate?: Value | undefined
    start?: Stock | undefined
    end?: Stock | undefined
    nonNegative?: boolean | undefined
  }
  export type LinkConfig = object
  export type StateConfig = {
    startActive?: (string | boolean) | undefined
    residency?: Value | undefined
  }
  export type TransitionConfig = {
    value?: Value | undefined
    start?: State | undefined
    end?: State | undefined
    recalculate?: boolean | undefined
    repeat?: boolean | undefined
    trigger?: TriggerType | undefined
  }
  export type ActionConfig = {
    value?: Value | undefined
    recalculate?: boolean | undefined
    repeat?: boolean | undefined
    trigger?: TriggerType | undefined
    action?: string | undefined
  }
  export type PopulationConfig = {
    agentBase?: Agent | undefined
    populationSize?: number | undefined
    geoUnits?: string | undefined
    geoWidth?: Value | undefined
    geoHeight?: Value | undefined
    geoWrapAround?: boolean | undefined
    geoPlacementType?: PlacementType | undefined
    geoPlacementFunction?: string | undefined
    networkType?: NetworkType | undefined
    networkFunction?: string | undefined
  }
  export type ContainerConfig = {
    frozen?: boolean | undefined
    customTimeSettings?:
      | {
          enabled: boolean
          algorithm: AlgorithmType
          timeStep: number
        }
      | undefined
  }
  export type FolderConfig = object
  export type AgentConfig = {
    agentParent?: string | undefined
  }
}
