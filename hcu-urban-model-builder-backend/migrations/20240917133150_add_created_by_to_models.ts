import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("models", (table) => {
    table.integer('createdBy')
    table.foreign('createdBy').references('id').inTable('users').onDelete('CASCADE')
  })
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("models", (table) => {
    table.dropColumn('createdBy')
  })
}

