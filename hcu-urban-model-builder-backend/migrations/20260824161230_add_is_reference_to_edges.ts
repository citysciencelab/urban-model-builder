import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('edges', function (table) {
    table.boolean('isReference').notNullable().defaultTo(false)
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('edges', function (table) {
    table.dropColumn('isReference')
  })
}
