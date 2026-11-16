import type { Id, Params } from '@feathersjs/feathers'
import { BadRequest, NotAuthenticated, NotFound } from '@feathersjs/errors'

import type { Application } from '../../declarations.js'
import { canStoreSecrets, decryptSecret, encryptSecret } from '../../llm/secret-box.js'
import type { LlmSettings, LlmSettingsPatch } from './llm-settings.schema.js'
import { LLM_SETTINGS_ID } from './llm-settings.shared.js'

export type { LlmSettings, LlmSettingsPatch }

const TABLE = 'llm_settings'

/**
 * The settings of the signed-in user for the in-app chat: their OpenRouter API key and preferred model.
 *
 * The key is write-only. It is stored encrypted, never returned by this service, and decrypted only on the
 * server for a chat request (`getOpenRouterKey`).
 */
export class LlmSettingsService {
  constructor(private app: Application) {}

  private get knex() {
    return this.app.get('postgresqlClient')
  }

  private getUserId(id: Id, params?: Params) {
    if (id !== LLM_SETTINGS_ID) {
      throw new NotFound(`The only id of this service is '${LLM_SETTINGS_ID}'.`)
    }
    const userId = params?.user?.id
    if (!userId) {
      throw new NotAuthenticated()
    }
    return userId
  }

  async get(id: Id, params?: Params): Promise<LlmSettings> {
    const userId = this.getUserId(id, params)
    const record = await this.knex(TABLE).where({ userId }).first()
    const { models, defaultModel } = this.app.get('llm')

    return {
      chatAvailable: canStoreSecrets(this.app),
      hasOpenRouterKey: !!record?.openRouterKey,
      openRouterKeyHint: record?.openRouterKeyHint ?? null,
      // a model that was removed from the configuration falls back to the default
      model: record?.model && models.includes(record.model) ? record.model : null,
      defaultModel,
      availableModels: models
    }
  }

  async patch(id: Id, data: LlmSettingsPatch, params?: Params): Promise<LlmSettings> {
    const userId = this.getUserId(id, params)
    const changes: Record<string, string | null> = {}

    if (data.openRouterKey !== undefined) {
      const key = data.openRouterKey?.trim() ?? null
      if (key && !canStoreSecrets(this.app)) {
        throw new BadRequest('This server is not configured to store API keys.')
      }
      changes.openRouterKey = key ? encryptSecret(this.app, key) : null
      changes.openRouterKeyHint = key ? `…${key.slice(-4)}` : null
    }
    if (data.model !== undefined) {
      if (data.model !== null && !this.app.get('llm').models.includes(data.model)) {
        throw new BadRequest(`The model '${data.model}' is not available.`)
      }
      changes.model = data.model
    }

    if (Object.keys(changes).length > 0) {
      await this.knex(TABLE)
        .insert({ userId, ...changes })
        .onConflict('userId')
        .merge()
    }
    return this.get(id, params)
  }

  /** Server-side only: the decrypted key of a user, or null if there is none or it cannot be decrypted. */
  async getOpenRouterKey(userId: string): Promise<string | null> {
    const record = await this.knex(TABLE).where({ userId }).first()
    return record?.openRouterKey ? decryptSecret(this.app, record.openRouterKey) : null
  }
}
