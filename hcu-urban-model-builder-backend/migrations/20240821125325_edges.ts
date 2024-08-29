// For more information about this file see https://dove.feathersjs.com/guides/cli/knexfile.html
import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('edges', (table) => {
    table.increments('id')

    table.integer('type')

    table.integer('modelId')
    table.integer('sourceId')
    table.integer('targetId')

    table.string('sourceHandle')
    table.string('targetHandle')

    table.foreign('modelId').references('id').inTable('models').onDelete('CASCADE')
    table.foreign('sourceId').references('id').inTable('nodes').onDelete('CASCADE')
    table.foreign('targetId').references('id').inTable('nodes').onDelete('CASCADE')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('edges')
}
