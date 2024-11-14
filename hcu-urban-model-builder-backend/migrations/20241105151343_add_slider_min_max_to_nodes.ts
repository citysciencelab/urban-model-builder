import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('nodes', (table) => {
    table.boolean('isParameter').defaultTo(false)
    table.float('parameterMin').nullable()
    table.float('parameterMax').nullable()
    table.float('parameterStep').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('nodes', (table) => {
    table.dropColumn('isParameter')
    table.dropColumn('parameterMin')
    table.dropColumn('parameterMax')
    table.dropColumn('parameterStep')
  })
}
