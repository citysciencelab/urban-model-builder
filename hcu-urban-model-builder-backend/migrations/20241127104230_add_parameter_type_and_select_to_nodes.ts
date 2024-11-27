import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('nodes', (table) => {
    table.string('parameterType')
    table.jsonb('parameterOptions')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('nodes', (table) => {
    table.dropColumn('parameterType')
    table.dropColumn('parameterOptions')
  })
}
