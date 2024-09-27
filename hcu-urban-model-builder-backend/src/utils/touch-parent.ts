import { HookContext, Service } from '@feathersjs/feathers'
import { Application, ServiceTypes } from '../declarations.js'
import { logger } from '../logger.js'
import EventEmitter from 'events'

export function touchParent<L extends keyof ServiceTypes, M extends keyof ServiceTypes>(
  app: Application,
  serviceName: keyof ServiceTypes,
  parentServiceName: L,
  foreignKey: string
) {
  const parentService = app.service(parentServiceName) as unknown as Service<any>

  const service = app.service(serviceName)

  service.on('created', async (result: any) => {
    if (result[foreignKey]) {
      try {
        await parentService.patch(
          result[foreignKey],
          { updatedAt: new Date().toISOString() },
          { isTouch: true }
        )
      } catch (error) {
        logger.error(
          `[EVENT: touchParent/${parentServiceName} created] Error while updating updatedAt of parent service`
        )
        logger.error(error)
      }
    }
  })
  service.on('patched', async (result: any, context: HookContext) => {
    if (result[foreignKey]) {
      try {
        if (!context.params?.isDeleteRelated) {
          await parentService.patch(
            result[foreignKey],
            { updatedAt: new Date().toISOString() },
            { isTouch: true }
          )
        } else {
          logger.verbose(
            `[EVENT: touchParent/${parentServiceName} patched] Not updating updatedAt of parent service because its triggered by 'deleteRelated' hook`
          )
        }
      } catch (error) {
        logger.error(
          `[EVENT: touchParent/${parentServiceName} patched] Error while updating updatedAt of parent service`
        )
        logger.error(error)
      }
    }
  })
}
