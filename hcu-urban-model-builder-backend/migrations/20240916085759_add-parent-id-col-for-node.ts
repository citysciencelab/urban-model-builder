import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('nodes', (table) => {
    table.integer('parentId').references('id').inTable('nodes').onDelete('CASCADE')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('nodes', (table) => {
    table.dropColumn('parentId')
  })
}
