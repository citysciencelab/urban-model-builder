declare module 'simulation/Simulator' {
  import { Population, Primitive } from 'simulation/blocks'
  export class Simulator {}
  export type ResultsType = {
    times?: number[] | undefined
    timeUnits?: string | undefined
    window?: any | undefined
    data?: ResultsDataType[] | undefined
    stochastic?: boolean | undefined
    error?: string | undefined
    errorPrimitive?: Primitive | undefined
    errorCode?: number | undefined
    value?: Function | undefined
    lastValue?: Function | undefined
    periods?: number | undefined
    resume?: Function | undefined
    setValue?: Function | undefined
    children?:
      | {
          [x: string]: {
            indexedNames?: string[]
            indexedFullNames?: string[]
            results?: ResultsResultsType[]
            states?: Set<string>
            dataMode?: 'auto' | 'agents' | 'float'
            data?: ResultsDataType
          }
        }
      | undefined
  }
  export type AgentResultsType = {
    id: string
    item: Population
    data: ResultsDataType
    results: ResultsResultsType
  }
  export type ResultsDataType = object
  export type ResultsResultsType = object
}
