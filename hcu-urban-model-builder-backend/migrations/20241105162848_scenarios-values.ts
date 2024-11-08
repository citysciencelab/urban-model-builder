// For more information about this file see https://dove.feathersjs.com/guides/cli/knexfile.html
import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('scenarios_values', (table) => {
    table.increments('id')
    table.float('value').notNullable()

    table.integer('nodesId').unsigned()
    table.foreign('nodesId').references('id').inTable('nodes').onDelete('CASCADE')

    table.integer('scenariosId').unsigned()
    table.foreign('scenariosId').references('id').inTable('scenarios').onDelete('CASCADE')

    table.timestamps(true, true, true)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('scenarios_values')
}
