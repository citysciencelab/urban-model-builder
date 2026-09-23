// Small query helpers shared by every service that needs to read a model
// version's full graph (models.class.ts for whole-model export/import,
// models-versions.class.ts for single-version export/import), so the query
// shape only needs to be maintained in one place.
import type { Application } from '../declarations.js'

export const findAllNodes = async (app: Application, modelsVersionsId: string) => {
  const result = await app.service('nodes')._find({
    query: {
      modelsVersionsId
    }
  })

  return result.data
}

export const findAllEdges = async (app: Application, modelsVersionsId: string) => {
  const result = await app.service('edges')._find({
    query: {
      modelsVersionsId
    }
  })

  return result.data
}

export const findAllScenarios = async (app: Application, modelsVersionsId: string) => {
  const result = await app.service('scenarios')._find({
    query: {
      modelsVersionsId
    }
  })

  return result.data
}

export const findAllScenarioValues = async (app: Application, scenariosId: string) => {
  const result = await app.service('scenarios-values')._find({
    query: {
      scenariosId
    }
  })

  return result.data
}
