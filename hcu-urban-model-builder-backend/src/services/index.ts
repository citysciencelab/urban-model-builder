import { scenarioValues } from './scenarios-values/scenarios-values.js'
import { scenarios } from './scenarios/scenarios.js'
import { modelsUsers } from './models-users/models-users.js'
import { modelsVersions } from './models-versions/models-versions.js'
import { user } from './users/users.js'
import { models } from './models/models.js'
import { edges } from './edges/edges.js'
import { nodes } from './nodes/nodes.js'
// For more information about this file see https://dove.feathersjs.com/guides/cli/application.html#configure-functions
import type { Application } from '../declarations.js'
import { touchParent } from '../utils/touch-parent.js'

export const services = (app: Application) => {
  app.configure(scenarioValues)
  app.configure(scenarios)
  app.configure(modelsUsers)
  app.configure(modelsVersions)
  app.configure(user)
  app.configure(models)
  app.configure(edges)
  app.configure(nodes)
  // All services will be registered here

  if (process.env.NODE_ENV !== 'test') {
    touchParent(app, 'models-versions', 'models', 'modelId')
    touchParent(app, 'nodes', 'models-versions', 'modelsVersionsId')
    touchParent(app, 'edges', 'models-versions', 'modelsVersionsId')
  }
}
