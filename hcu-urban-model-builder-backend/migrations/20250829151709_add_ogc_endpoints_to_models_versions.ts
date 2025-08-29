import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('models_versions', function (table) {
    table.jsonb('ogcEndpoints').defaultTo('[]')
  })

  // Seed with Hamburg API as default endpoint for all existing model versions
  await knex('models_versions').update({
    ogcEndpoints: JSON.stringify([
      {
        id: 'hamburg-api',
        name: 'Hamburg Open Data API',
        baseUrl: 'https://api.hamburg.de/datasets/v1',
        isDefault: true
      }
    ])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('models_versions', function (table) {
    table.dropColumn('ogcEndpoints')
  })
}
