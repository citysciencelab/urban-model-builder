import { HookContext } from '../../../declarations.js'
import { Nodes } from '../nodes.schema.js'

export const manageDefaultScenariosValues = async (context: HookContext) => {
  if (!context.result || 'total' in context.result) {
    throw new Error('Not implemented')
  } else {
    /**
     * Get or create default scenario
     * @param modelsVersionsId
     * @returns
     */
    const getOrCreateDefaultScenario = async (modelsVersionsId: string) => {
      let scenario = await context.app.service('scenarios')._findDefaultForModelVersion(modelsVersionsId)
      if (!scenario) {
        scenario = await context.app.service('scenarios').create({
          modelsVersionsId: modelsVersionsId,
          name: 'Default',
          isDefault: true
        })
      }
      return scenario
    }

    /**
     * Create scenario value if not exists
     * @param scenarioId
     * @param item
     */
    const createScenarioValueIfNotExists = async (scenarioId: string, item: Nodes) => {
      const scenarioValues = await context.app.service('scenarios-values').find({
        query: {
          scenariosId: scenarioId,
          nodesId: item.id
        }
      })
      if (scenarioValues.total === 0) {
        const paramDefaultValue = Number(
          Number.isNaN(Number(item.data.value)) == true ? item.parameterMin : item.data.value
        )
        await context.app.service('scenarios-values').create({
          value: paramDefaultValue,
          scenariosId: scenarioId,
          nodesId: item.id
        })
      }
    }

    /**
     * Remove scenario value if exists
     * @param scenarioId
     * @param item
     */
    const removeScenarioValueIfExists = async (scenarioId: string, item: Nodes) => {
      const scenarioValues = await context.app.service('scenarios-values').find({
        query: {
          scenariosId: scenarioId,
          nodesId: item.id
        }
      })
      if (scenarioValues.total > 0) {
        await context.app.service('scenarios-values').remove(scenarioValues.data[0].id)
      }
    }

    /**
     * Remove default scenario if empty
     * @param scenarioId
     */
    const removeDefaultScenarioIfEmpty = async (scenarioId: string) => {
      const scenarioValues = await context.app.service('scenarios-values').find({
        query: {
          scenariosId: scenarioId
        }
      })
      if (scenarioValues.total === 0) {
        await context.app.service('scenarios').remove(scenarioId)
      }
    }

    /**
     * Main logic
     * Does currently only work for single patches
     */
    const item = context.result as Nodes

    if (item.isParameter && context.method != 'remove') {
      const scenario = await getOrCreateDefaultScenario(item.modelsVersionsId)
      await createScenarioValueIfNotExists(scenario.id, item)
    } else {
      const scenario = await context.app
        .service('scenarios')
        ._findDefaultForModelVersion(item.modelsVersionsId)
      if (scenario) {
        await removeScenarioValueIfExists(scenario.id, item)
        await removeDefaultScenarioIfEmpty(scenario.id)
      }
    }
  }
}
