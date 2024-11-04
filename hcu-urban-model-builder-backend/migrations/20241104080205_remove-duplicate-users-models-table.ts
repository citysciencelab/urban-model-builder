import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTable('models-users')
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.createTable('models-users', (table) => {
    table.increments('id')

    table.string('text')
  })
}
