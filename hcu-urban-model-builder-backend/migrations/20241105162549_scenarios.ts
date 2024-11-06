// For more information about this file see https://dove.feathersjs.com/guides/cli/knexfile.html
import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('scenarios', (table) => {
    table.increments('id')

    table.string('name')
    table.boolean('isDefault').defaultTo(false)

    table.integer('modelsVersionsId').unsigned()
    table.foreign('modelsVersionsId').references('id').inTable('models_versions').onDelete('CASCADE')

    table.timestamps(true, true, true)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('scenarios')
}
