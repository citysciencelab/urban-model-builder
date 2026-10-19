import type { Knex } from 'knex'

// node type 11 = OgcApiFeatures
const OGC_API_FEATURES_NODE_TYPE = 11

// OGC API Features nodes created before endpoints were configurable always used the Hamburg API
export async function up(knex: Knex): Promise<void> {
  await knex('nodes')
    .where({ type: OGC_API_FEATURES_NODE_TYPE })
    .whereRaw(`NOT (data ? 'endpointId') AND NOT (data ? 'baseUrl')`)
    .update({
      data: knex.raw(`data || ?::jsonb`, [
        JSON.stringify({
          endpointId: 'hamburg-api',
          baseUrl: 'https://api.hamburg.de/datasets/v1',
          apiType: 'multi-api'
        })
      ])
    })
}

// the added endpoint data is equivalent to the previous default, nothing to revert
export async function down(): Promise<void> {}
