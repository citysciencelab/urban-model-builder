import type { Knex } from 'knex'

// A result keeps the name of the preset it was simulated with, also after the
// preset itself is deleted (which only clears `scenariosId`).
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('simulation_results', (table) => {
    table.string('scenarioName', 255).nullable()
  })
  await knex.raw(`
    UPDATE simulation_results
    SET "scenarioName" = scenarios.name
    FROM scenarios
    WHERE simulation_results."scenariosId" = scenarios.id
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('simulation_results', (table) => {
    table.dropColumn('scenarioName')
  })
}
