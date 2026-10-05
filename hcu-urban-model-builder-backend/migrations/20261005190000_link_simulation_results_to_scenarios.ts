import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('simulation_results', (table) => {
    table
      .uuid('scenariosId')
      .nullable()
      .references('id')
      .inTable('scenarios')
      .onDelete('SET NULL')
    table.index(['scenariosId'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('simulation_results', (table) => {
    table.dropIndex(['scenariosId'])
    table.dropColumn('scenariosId')
  })
}
