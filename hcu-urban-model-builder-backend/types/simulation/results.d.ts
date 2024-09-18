declare module 'simulation/Results' {
  import { Primitive } from 'simulation/blocks'
  import type { ResultsType } from 'simulation/Simulator'
  export class Results {
    constructor(
      data: ResultsType,
      nameIdMapping: {
        [x: string]: string
      }
    )
    _data: ResultsType
    _nameIdMapping: {
      [x: string]: string
    }
    timeUnits: string
    times(): number[]
    table(primitives?: Primitive[] | undefined): {
      _time: number
    }[]
    series(primitive: Primitive): any
    value(primitive: Primitive, time?: number | undefined): any
  }
}
