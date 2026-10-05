import { Type, getValidator, defaultAppConfiguration } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import { dataValidator } from './validators.js'

export const configurationSchema = Type.Intersect([
  defaultAppConfiguration,
  Type.Object({
    host: Type.String(),
    port: Type.Number(),
    public: Type.String(),
    // Upper bound for the runs of one stored simulation batch; the client's
    // APP.MAX_SIMULATION_BATCH_RUNS should match it.
    maxSimulationBatchRuns: Type.Integer({ minimum: 1 })
  })
])

export type ApplicationConfiguration = Static<typeof configurationSchema>

export const configurationValidator = getValidator(configurationSchema, dataValidator)
