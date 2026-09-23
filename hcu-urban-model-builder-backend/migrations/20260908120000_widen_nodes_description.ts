import type { Knex } from 'knex'

// Knoten-Beschreibungen sollen Quellenangaben und Indikator-Definitionen aufnehmen
// koennen. varchar(255) ist dafuer zu kurz; models.description ist bereits text.
export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('nodes', function (table) {
    table.text('description').alter()
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('nodes', function (table) {
    table.string('description', 255).alter()
  })
}
