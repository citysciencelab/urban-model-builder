import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('nodes', (table) => {
    table.string('description')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('nodes', (table) => {
    table.dropColumn('description')
  })
}
