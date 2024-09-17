import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("models", (table) => {
    table.dateTime('deletedAt')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("models", (table) => {
    table.dropColumn('deletedAt')
  })
}
