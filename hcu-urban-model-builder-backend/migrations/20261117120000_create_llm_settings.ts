import type { Knex } from 'knex'
import { onUpdateTrigger } from '../knexfile.js'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('llm_settings', function (table) {
    table.uuid('id').primary().defaultTo(knex.fn.uuid())
    table.uuid('userId').notNullable().unique().references('id').inTable('users').onDelete('CASCADE')
    // the user's OpenRouter API key, encrypted (see src/llm/secret-box.ts)
    table.text('openRouterKey').nullable()
    // the last characters of the key, to recognise it in the settings
    table.string('openRouterKeyHint', 16).nullable()
    table.string('model', 255).nullable()
    table.timestamps(true, true, true)
  })
  await knex.raw(onUpdateTrigger('llm_settings'))
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('llm_settings')
}
