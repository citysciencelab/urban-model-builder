// For more information about this file see https://dove.feathersjs.com/guides/cli/channels.html
import type { RealTimeConnection, Params, ServiceGenericType } from '@feathersjs/feathers'
import type { AuthenticationResult } from '@feathersjs/authentication'
import '@feathersjs/transport-commons'
import type { Application, HookContext } from './declarations.js'
import { logger } from './logger.js'
import { Nodes, NodesData } from './services/nodes/nodes.shared.js'

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

  app.service('nodes').publish(modelVersionBasedPublisher('modelsVersionsId'))
  app.service('edges').publish(modelVersionBasedPublisher('modelsVersionsId'))
  app.service('scenarios').publish(modelVersionBasedPublisher('modelsVersionsId'))
  app.service('models-versions').publish(modelVersionBasedPublisher('id'))
}
