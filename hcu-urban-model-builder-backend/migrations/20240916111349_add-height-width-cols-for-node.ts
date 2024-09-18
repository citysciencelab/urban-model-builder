import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('nodes', (table) => {
    table.integer('height').nullable()
    table.integer('width').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('nodes', (table) => {
    table.dropColumn('height')
    table.dropColumn('width')
  })
}
