import { models } from './models/models.js'
import { simulate } from './simulate/simulate.js'
import { edges } from './edges/edges.js'
import { nodes } from './nodes/nodes.js'
// For more information about this file see https://dove.feathersjs.com/guides/cli/application.html#configure-functions
import type { Application } from '../declarations.js'

export const services = (app: Application) => {
  app.configure(models)
  app.configure(simulate)
  app.configure(edges)
  app.configure(nodes)
  // All services will be registered here
}
