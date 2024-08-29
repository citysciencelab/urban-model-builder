// For more information about this file see https://dove.feathersjs.com/guides/cli/knexfile.html
import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('models', (table) => {
    table.increments('id')

    table.string('name')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('models')
}
