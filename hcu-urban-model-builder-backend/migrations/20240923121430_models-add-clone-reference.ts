// For more information about this file see https://dove.feathersjs.com/guides/cli/knexfile.html
import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('models', (table) => {
    table.integer('forkedFromVersionId').nullable()
    table.foreign('forkedFromVersionId').references('id').inTable('models_versions').onDelete('CASCADE')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('models', (table) => {
    table.dropColumn('forkedFromVersionId')
  })
}
