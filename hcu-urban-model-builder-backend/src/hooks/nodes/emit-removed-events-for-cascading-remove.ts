import { HookContext, NextFunction, ServiceTypes } from '../../declarations.js'

export function emitRemovedEventsForCascadingRemove() {
  return async (context: HookContext<ServiceTypes['nodes']>, next: NextFunction) => {
    if (context.method !== 'remove') {
      throw new Error('stashGhostChildren hook should be used on the remove method')
    }

    const nodesService = context.app.service('nodes')
    const scenariosValuesService = context.app.service('scenarios-values')

    if (!context.id) {
      throw new Error('stashGhostChildren hook should be used on a single node')
    }

    const ghostChildNodes = await nodesService.find({
      query: {
        ghostParentId: context.id as string
      }
    })
    const scenarioValues = await scenariosValuesService.find({
      query: {
        nodesId: context.id as string
      }
    })

    await next()

    if (ghostChildNodes.total) {
      for (const ghostChildNode of ghostChildNodes.data) {
        nodesService.emit('removed', ghostChildNode)
      }
    }
    if (scenarioValues.total) {
      for (const scenarioValue of scenarioValues.data) {
        scenariosValuesService.emit('removed', scenarioValue)
      }
    }
  }
}
