import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('models_users', (table) => {
    table.dropForeign('userId')
    table.foreign('userId').references('users.id').onDelete('CASCADE')

    table.dropForeign('modelId')
    table.foreign('modelId').references('models.id').onDelete('CASCADE')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('models_users', (table) => {
    table.dropForeign('userId')
    table.foreign('userId').references('users.id')

    table.dropForeign('modelId')
    table.foreign('modelId').references('models.id')
  })
}
