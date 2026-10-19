import type { Knex } from 'knex'

// endpoints seeded by 20250829151709 have no apiType, the Hamburg API serves multiple APIs
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    UPDATE models_versions
    SET "ogcEndpoints" = (
      SELECT jsonb_agg(
        CASE
          WHEN endpoint->>'id' = 'hamburg-api' AND NOT endpoint ? 'apiType'
            THEN endpoint || '{"apiType": "multi-api"}'::jsonb
          ELSE endpoint
        END
      )
      FROM jsonb_array_elements("ogcEndpoints") AS endpoint
    )
    WHERE jsonb_typeof("ogcEndpoints") = 'array' AND jsonb_array_length("ogcEndpoints") > 0
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    UPDATE models_versions
    SET "ogcEndpoints" = (
      SELECT jsonb_agg(
        CASE WHEN endpoint->>'id' = 'hamburg-api' THEN endpoint - 'apiType' ELSE endpoint END
      )
      FROM jsonb_array_elements("ogcEndpoints") AS endpoint
    )
    WHERE jsonb_typeof("ogcEndpoints") = 'array' AND jsonb_array_length("ogcEndpoints") > 0
  `)
}
