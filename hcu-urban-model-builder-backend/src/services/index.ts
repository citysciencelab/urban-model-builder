import { adminPublicModelVersionsUnapprove } from './admin/public-model-versions/unapprove/unapprove.js'
import { adminPublicModelVersionsApprove } from './admin/public-model-versions/approve/approve.js'
import { adminPublicModelVersions } from './admin/public-model-versions/public-model-versions.js'
import { jobResults } from './ogcapi/jobs/results/results.js'
import { processesExecution } from './ogcapi/processes/execution/execution.js'
import { jobs } from './ogcapi/jobs/jobs.js'
import { processes } from './ogcapi/processes/processes.js'
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
  app.configure(adminPublicModelVersionsUnapprove)
  app.configure(adminPublicModelVersionsApprove)
  app.configure(adminPublicModelVersions)
  app.configure(jobResults)
  app.configure(jobs)
  app.configure(processesExecution)
  app.configure(processes)
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
