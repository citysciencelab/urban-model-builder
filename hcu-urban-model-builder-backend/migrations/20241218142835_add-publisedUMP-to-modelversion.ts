import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('models_versions', (table) => {
    table.timestamp('publishedToUMPAt').nullable().defaultTo(null)
  })
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('models_versions', (table) => {
    table.dropColumn('publishedToUMPAt')
  })
}

