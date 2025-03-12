// For more information about this file see https://dove.feathersjs.com/guides/cli/channels.html
import type { RealTimeConnection, Params, ServiceGenericType, Service } from '@feathersjs/feathers'
import type { AuthenticationResult } from '@feathersjs/authentication'
import '@feathersjs/transport-commons'
import type { Application, HookContext, ServiceTypes } from './declarations.js'
import { logger } from './logger.js'

export const channels = (app: Application) => {
  app.on('connection', (connection: RealTimeConnection) => {
    // not needed for now
  })

  app.on('login', (authResult: AuthenticationResult, { connection }: Params) => {
    // connection can be undefined if there is no
    // real-time connection, e.g. when logging in via REST
    if (connection) {
      // Add it to the authenticated user channel
      app.channel('authenticated').join(connection)
    }
  })

  // eslint-disable-next-line no-unused-vars
  app.publish((data: any, context: HookContext) => {
    // do not automatically publish
    return []
  })

  const modelVersionBasePublisher = (modelVersionForeignKey: string) => (data: any, context: HookContext) => {
    if (!(modelVersionForeignKey in data)) {
      logger.error(`Missing ${modelVersionForeignKey} in data`, data)
      return []
    }

    const modelVersionId = data[modelVersionForeignKey]

    return app.channel(`model-versions:${modelVersionId}`).filter((connection) => {
      return connection !== context?.params?.connection
    })
  }

  const modelVersionBaseDeepPublisher = (
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
      if (!(modelVersionForeignKey in parentDataSet)) {
        logger.error(`Missing ${modelVersionForeignKey} in data`, data)
        return []
      }

      const modelVersionId = parentDataSet[modelVersionForeignKey]
      return app.channel(`model-versions:${modelVersionId}`).filter((connection) => {
        return connection !== context?.params?.connection
      })
    }
  }

  app.service('nodes').publish(modelVersionBasePublisher('modelsVersionsId'))
  app.service('edges').publish(modelVersionBasePublisher('modelsVersionsId'))
  app.service('scenarios').publish(modelVersionBasePublisher('modelsVersionsId'))
  app
    .service('scenarios-values')
    .publish(modelVersionBaseDeepPublisher('scenarios', 'scenariosId', 'modelsVersionsId'))
  app.service('models-versions').publish(modelVersionBasePublisher('id'))
}
