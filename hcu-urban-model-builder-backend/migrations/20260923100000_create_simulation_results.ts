import type { Knex } from 'knex'
import { onUpdateTrigger } from '../knexfile.js'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('simulation_results', function (table) {
    table.uuid('id').primary().defaultTo(knex.fn.uuid())
    table.uuid('modelsVersionsId').notNullable().references('id').inTable('models_versions').onDelete('CASCADE')
    table.uuid('scenariosId').references('id').inTable('scenarios').onDelete('SET NULL')
    table.uuid('createdBy').notNullable().references('id').inTable('users').onDelete('CASCADE')
    table.string('name', 255)
    table.text('description')
    table.jsonb('metadata').notNullable()
    table.jsonb('scenario').notNullable()
    table.jsonb('results').notNullable()
    table.timestamp('createdAt').defaultTo(knex.fn.now())
    table.timestamp('updatedAt').defaultTo(knex.fn.now())
    table.timestamp('deletedAt')
  })
  await knex.raw(onUpdateTrigger('simulation_results'))
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('simulation_results')
}
