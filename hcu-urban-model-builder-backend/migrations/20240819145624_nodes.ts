// For more information about this file see https://dove.feathersjs.com/guides/cli/knexfile.html
import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('nodes', (table) => {
    table.increments('id')

    table.integer('type')
    table.string('name')
    table.jsonb('data')
    table.jsonb('position')
    table.float('value')
    table.string('rate')

    table.integer('modelId')

    table.foreign('modelId').references('id').inTable('models').onDelete('CASCADE')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('nodes')
}
