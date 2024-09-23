import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('models', (table) => {
    table.float('timeStep').nullable()
    table.string('globals').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('models', (table) => {
    table.dropColumn('timeStep')
    table.dropColumn('globals')
  })
}
