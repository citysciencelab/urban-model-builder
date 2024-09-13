declare module 'simulation' {
  interface SimulationPrimitive {
    id: number
  }

  class Model {
    constructor(options: Record<string, any>)

    Stock(options: Record<string, any>): SimulationPrimitive

    Variable(options: Record<string, any>): SimulationPrimitive

    Flow(
      source: SimulationPrimitive | null,
      target: SimulationPrimitive | null,
      options: any
    ): SimulationPrimitive

    Link(source: SimulationPrimitive, target: SimulationPrimitive): SimulationPrimitive

    simulate(): {
      timeUnits: string
      _data: Record<string, any>
      _nameIdMapping: Record<number, string>
    }
  }
}

declare module 'simulation-viz-console'
