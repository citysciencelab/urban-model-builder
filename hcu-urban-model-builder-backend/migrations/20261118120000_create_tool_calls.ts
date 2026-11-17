import type { Knex } from 'knex'

// Log of what language models did on behalf of users (see src/model-tools/audit-log.ts)
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tool_calls', function (table) {
    table.uuid('id').primary().defaultTo(knex.fn.uuid())
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE')
    // 'mcp', 'chat' or 'internal'
    table.string('source', 16).notNullable()
    table.string('tool', 64).notNullable()
    // what the call was about; no foreign keys, so that the log outlives deleted models
    table.uuid('modelId').nullable()
    table.uuid('modelVersionId').nullable()
    table.boolean('ok').notNullable()
    table.string('errorCode', 32).nullable()
    table.integer('durationMs').notNullable()
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now())

    table.index(['userId', 'createdAt'])
    table.index(['modelVersionId', 'createdAt'])
    table.index('createdAt')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('tool_calls')
}
