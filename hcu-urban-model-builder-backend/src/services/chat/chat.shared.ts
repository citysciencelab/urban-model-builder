// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { ClientApplication } from '../../client.js'
import type {
  ChatProgress,
  ChatRequest,
  ChatResponse,
  ChatSimulationResult,
  ChatStarted,
  ChatService
} from './chat.class.js'

export type { ChatProgress, ChatRequest, ChatResponse, ChatSimulationResult, ChatStarted }

export type ChatClientService = Pick<ChatService, (typeof chatMethods)[number]>

export const chatPath = 'chat'

export const chatMethods: Array<keyof ChatService> = ['create', 'submitSimulation']

/** Event sent to the caller of `create` while its request is running. */
export const CHAT_PROGRESS_EVENT = 'progress'

export const chatClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(chatPath, connection.service(chatPath), {
    methods: chatMethods,
    events: [CHAT_PROGRESS_EVENT]
  })
}

// Add this service to the client service type index
declare module '../../client.js' {
  interface ServiceTypes {
    [chatPath]: ChatClientService
  }
}
