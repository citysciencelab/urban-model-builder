import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('simulation_results', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid())
    table
      .uuid('modelsVersionsId')
      .notNullable()
      .references('id')
      .inTable('models_versions')
      .onDelete('CASCADE')
    table.uuid('createdBy').references('id').inTable('users').onDelete('SET NULL')
    table.string('name', 255).notNullable()
    table.jsonb('scenario').notNullable().defaultTo('{}')
    table.jsonb('result').notNullable()
    table.timestamps(true, true, true)
    table.index(['modelsVersionsId', 'createdAt'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('simulation_results')
}
