// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { ClientApplication } from '../../client.js'
import type { LlmSettings, LlmSettingsPatch, LlmSettingsService } from './llm-settings.class.js'

export type { LlmSettings, LlmSettingsPatch }

export type LlmSettingsClientService = Pick<LlmSettingsService, (typeof llmSettingsMethods)[number]>

export const llmSettingsPath = 'llm-settings'

export const llmSettingsMethods: Array<keyof LlmSettingsService> = ['get', 'patch']

/** The only id of the service: the settings of the signed-in user. */
export const LLM_SETTINGS_ID = 'me'

export const llmSettingsClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(llmSettingsPath, connection.service(llmSettingsPath), {
    methods: llmSettingsMethods
  })
}

// Add this service to the client service type index
declare module '../../client.js' {
  interface ServiceTypes {
    [llmSettingsPath]: LlmSettingsClientService
  }
}
