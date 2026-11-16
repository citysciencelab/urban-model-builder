// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { hooks as schemaHooks } from '@feathersjs/schema'

import type { Application } from '../../declarations.js'
import { LlmSettingsService } from './llm-settings.class.js'
import { llmSettingsPatchValidator } from './llm-settings.schema.js'
import { llmSettingsPath, llmSettingsMethods } from './llm-settings.shared.js'

export * from './llm-settings.class.js'
export * from './llm-settings.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const llmSettings = (app: Application) => {
  app.use(llmSettingsPath, new LlmSettingsService(app), {
    methods: llmSettingsMethods,
    events: []
  })

  app.service(llmSettingsPath).hooks({
    before: {
      patch: [schemaHooks.validateData(llmSettingsPatchValidator)]
    }
  })
}

// Add this service to the service type index
declare module '../../declarations.js' {
  interface ServiceTypes {
    [llmSettingsPath]: LlmSettingsService
  }
}
