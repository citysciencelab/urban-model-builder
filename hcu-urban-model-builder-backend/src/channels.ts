// For more information about this file see https://dove.feathersjs.com/guides/cli/channels.html
import type { RealTimeConnection, Params, ServiceGenericType, Service } from '@feathersjs/feathers'
import type { AuthenticationResult } from '@feathersjs/authentication'
import '@feathersjs/transport-commons'
import type { Application, HookContext, ServiceTypes } from './declarations.js'
import { logger } from './logger.js'

export const channels = (app: Application) => {
  logger.warn(
    'Publishing all events to all authenticated users. See `channels.ts` and https://dove.feathersjs.com/api/channels.html for more information.'
  )

  app.on('connection', (connection: RealTimeConnection) => {
    // On a new real-time connection, add it to the anonymous channel
    app.channel('anonymous').join(connection)
  })

  app.on('login', (authResult: AuthenticationResult, { connection }: Params) => {
    // connection can be undefined if there is no
    // real-time connection, e.g. when logging in via REST
    if (connection) {
      // The connection is no longer anonymous, remove it
      app.channel('anonymous').leave(connection)

      // Add it to the authenticated user channel
      app.channel('authenticated').join(connection)
    }
  })

  // eslint-disable-next-line no-unused-vars
  app.publish((data: any, context: HookContext) => {
    // Here you can add event publishers to channels set up in `channels.js`
    // To publish only for a specific event use `app.publish(eventname, () => {})`
  })

  const modelVersionBasedPublisher =
    (modelVersionForeignKey: string) => (data: any, context: HookContext) => {
      if (!(modelVersionForeignKey in data)) {
        logger.error(`Missing ${modelVersionForeignKey} in data`, data)
        return
      }

      const modelVersionId = data[modelVersionForeignKey]

      return app.channel(`model-versions:${modelVersionId}`).filter((connection) => {
        return connection !== context?.params?.connection
      })
    }

  const modelVersionBasedDeepPublisher = (
    parentServiceName: keyof ServiceTypes,
    parentForeignKey: string,
    modelVersionForeignKey: string
  ) => {
    const parentService = app.service(parentServiceName)
    if (!('get' in parentService)) {
      throw new Error(`Service ${parentServiceName} does not have a get method`)
    }
    return async (data: any, context: HookContext) => {
      const parentDataSet = await parentService.get(data[parentForeignKey])
      const modelVersionId = parentDataSet[modelVersionForeignKey]
      return app.channel(`model-versions:${modelVersionId}`).filter((connection) => {
        return connection !== context?.params?.connection
      })
    }
  }

  app.service('nodes').publish(modelVersionBasedPublisher('modelsVersionsId'))
  app.service('edges').publish(modelVersionBasedPublisher('modelsVersionsId'))
  app.service('scenarios').publish(modelVersionBasedPublisher('modelsVersionsId'))
  app
    .service('scenarios-values')
    .publish(modelVersionBasedDeepPublisher('scenarios', 'scenariosId', 'modelsVersionsId'))
  app.service('models-versions').publish(modelVersionBasedPublisher('id'))
}
