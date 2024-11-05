import { HookContext, NextFunction, ServiceTypes } from '../../declarations.js'

export function emitRemovedForGhostChildren() {
  return async (context: HookContext<ServiceTypes['nodes']>, next: NextFunction) => {
    if (context.method !== 'remove') {
      throw new Error('stashGhostChildren hook should be used on the remove method')
    }

    const service = context.app.service('nodes')

    if (!context.id) {
      throw new Error('stashGhostChildren hook should be used on a single node')
    }

    const ghostChildNodes = await service.find({
      query: {
        ghostParentId: context.id as number
      }
    })

    await next()

    if (ghostChildNodes.total) {
      for (const ghostChildNode of ghostChildNodes.data) {
        service.emit('removed', ghostChildNode)
      }
    }
  }
}
