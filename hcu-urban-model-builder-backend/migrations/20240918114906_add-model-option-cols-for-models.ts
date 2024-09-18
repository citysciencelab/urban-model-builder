import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('models', (table) => {
    table.string('timeUnits').nullable()
    table.float('timeStart').nullable()
    table.float('timeLength').nullable()
    table.string('algorithm').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('models', (table) => {
    table.dropColumn('timeUnits')
    table.dropColumn('timeStart')
    table.dropColumn('timeLength')
    table.dropColumn('algorithm')
  })
}
