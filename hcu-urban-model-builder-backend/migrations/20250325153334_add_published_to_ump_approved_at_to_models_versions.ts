import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('models_versions', function (table) {
    table.timestamp('publishedToUMPApprovedAt').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('models_versions', function (table) {
    table.dropColumn('publishedToUMPApprovedAt')
  })
}
