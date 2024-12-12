import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('edges', (table) => {
    table.jsonb('points').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('edges', (table) => {
    table.dropColumn('points')
  })
}
