// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { hooks as schemaHooks } from '@feathersjs/schema'

import type { Application } from '../../declarations.js'
import { ChatService, PROGRESS_CHANNEL_KEY } from './chat.class.js'
import { chatRequestValidator } from './chat.schema.js'
import { chatPath, chatMethods, CHAT_PROGRESS_EVENT } from './chat.shared.js'

export * from './chat.class.js'
export * from './chat.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const chat = (app: Application) => {
  app.use(chatPath, new ChatService(app), {
    methods: chatMethods,
    events: [CHAT_PROGRESS_EVENT]
  })

  app.service(chatPath).hooks({
    before: {
      create: [schemaHooks.validateData(chatRequestValidator)]
    }
  })

  // Progress is sent to the connection that made the request and to nobody else. The result of `create`
  // itself is not published at all (see the default publisher in channels.ts).
  app.service(chatPath).publish(CHAT_PROGRESS_EVENT, (data: any) => {
    const { [PROGRESS_CHANNEL_KEY]: channel, ...progress } = data
    return app.channel(channel).send(progress)
  })
}

// Add this service to the service type index
declare module '../../declarations.js' {
  interface ServiceTypes {
    [chatPath]: ChatService
  }
}
