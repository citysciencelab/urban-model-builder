import type { Knex } from 'knex'
import { onUpdateTrigger } from '../knexfile.js'

export async function up(knex: Knex): Promise<void> {
  for (const tableName of ['nodes', 'edges', 'models']) {
    await knex.schema.alterTable(tableName, (table) => {
      table.timestamps(true, true, true)
    })
    await knex.raw(onUpdateTrigger(tableName))
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const tableName of ['nodes', 'edges', 'models']) {
    await knex.schema.alterTable(tableName, (table) => {
      table.dropColumn('createdAt')
      table.dropColumn('updatedAt')
    })
    await knex.raw(`DROP TRIGGER ${tableName}_updated_at ON ${tableName}`)
  }
}
