import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('models_users', (table) => {
    table.increments('id')

    table.integer('userId').unsigned().notNullable()
    table.integer('modelId').unsigned().notNullable()

    table.integer('role').unsigned().notNullable().defaultTo(0)

    table.foreign('userId').references('users.id')
    table.foreign('modelId').references('models.id')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('models_users')
}
