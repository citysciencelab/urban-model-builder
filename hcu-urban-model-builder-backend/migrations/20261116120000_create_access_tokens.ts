import type { Knex } from 'knex'
import { onUpdateTrigger } from '../knexfile.js'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('access_tokens', function (table) {
    table.uuid('id').primary().defaultTo(knex.fn.uuid())
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE').index()
    table.string('name', 255).notNullable()
    // only the hash of a token is stored, the token itself is shown once on creation
    table.string('tokenHash', 64).notNullable().unique()
    // the first characters of the token, to tell tokens apart in the list
    table.string('tokenPrefix', 32).notNullable()
    table.timestamp('expiresAt').notNullable()
    table.timestamp('lastUsedAt').nullable()
    table.timestamps(true, true, true)
  })
  await knex.raw(onUpdateTrigger('access_tokens'))
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('access_tokens')
}
