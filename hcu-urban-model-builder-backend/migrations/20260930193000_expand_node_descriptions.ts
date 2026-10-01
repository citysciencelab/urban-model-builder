import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Node descriptions are free-form documentation. Exported models can
  // legitimately contain substantially more than 255 characters.
  await knex.schema.alterTable('nodes', (table) => {
    table.text('description').alter()
  })
}

export async function down(knex: Knex): Promise<void> {
  // This intentionally fails rather than silently truncating descriptions if
  // rows longer than 255 characters exist when rolling back.
  await knex.schema.alterTable('nodes', (table) => {
    table.string('description', 255).alter()
  })
}
