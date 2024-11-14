import { FeathersError } from '@feathersjs/errors'

export class SimulationError extends FeathersError {
  constructor(message: string, data?: { nodeId: number | null; simulationErrorCode?: string }) {
    super(message, 'SimulationError', 422, 'simulation-error', data)
  }
}
