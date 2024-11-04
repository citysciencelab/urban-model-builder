import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('nodes', (table) => {
    table.integer('ghostParentId')
    table.foreign('ghostParentId').references('id').inTable('nodes').onDelete('CASCADE')

    table.string('name').nullable().alter()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('nodes', (table) => {
    table.dropColumn('ghostParentId')

    table.string('name').notNullable().alter()
  })
}
