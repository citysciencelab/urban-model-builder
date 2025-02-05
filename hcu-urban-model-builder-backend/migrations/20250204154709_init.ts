import type { Knex } from 'knex'
import { onUpdateTrigger } from '../knexfile.js'

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION on_update_timestamp()
    RETURNS trigger AS $$
    BEGIN
      NEW."updatedAt" = now();
      RETURN NEW;
    END;
  $$ language 'plpgsql';
  `)

  await knex.schema.createTable('users', function (table) {
    table.uuid('id').primary().defaultTo(knex.fn.uuid())
    table.string('email', 255).unique()
    table.string('password', 255)
    table.string('oidcId', 255).unique()

    table.timestamps(true, true, true) // TODO: check if needed
  })
  await knex.raw(onUpdateTrigger('users'))

  await knex.schema.createTable('models_versions', function (table) {
    table.uuid('id').primary().defaultTo(knex.fn.uuid())
    table.uuid('parentId').references('id').inTable('models_versions').onDelete('CASCADE')
    table.text('notes')
    table.integer('majorVersion')
    table.integer('minorVersion')
    table.integer('draftVersion')
    table.float('timeStep')
    table.string('globals', 255)
    table.string('timeUnits', 255)
    table.float('timeStart')
    table.float('timeLength')
    table.string('algorithm', 255)
    table.uuid('createdBy').references('id').inTable('users').onDelete('CASCADE')
    table.uuid('publishedBy').references('id').inTable('users').onDelete('CASCADE')
    table.timestamp('publishedAt')
    table.boolean('isLatest')
    table.jsonb('customUnits')

    table.timestamps(true, true, true)
    table.timestamp('deletedAt')
  })
  await knex.raw(onUpdateTrigger('models_versions'))

  await knex.schema.createTable('models', function (table) {
    table.uuid('id').primary().defaultTo(knex.fn.uuid())
    table.string('internalName', 255)
    table.uuid('createdBy').references('id').inTable('users').onDelete('CASCADE')
    table.string('publicName', 255)
    table.text('description')
    table.uuid('latestPublishedVersionId').references('id').inTable('models_versions').onDelete('CASCADE')
    table.uuid('latestDraftVersionId').references('id').inTable('models_versions').onDelete('CASCADE')
    table.integer('currentMinorVersion')
    table.integer('currentMajorVersion')
    table.integer('currentDraftVersion')
    table.uuid('globalUuid')
    table.uuid('forkedFromVersionId').references('id').inTable('models_versions').onDelete('CASCADE')

    table.timestamps(true, true, true)
    table.timestamp('deletedAt')
  })
  await knex.raw(onUpdateTrigger('models'))

  await knex.schema.alterTable('models_versions', function (table) {
    table.uuid('modelId').references('id').inTable('models').onDelete('CASCADE')
  })

  await knex.schema.createTable('models_users', function (table) {
    table.uuid('id').primary().defaultTo(knex.fn.uuid())
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE')
    table.uuid('modelId').notNullable().references('id').inTable('models').onDelete('CASCADE')
    table.integer('role').defaultTo(0).notNullable()

    table.timestamps(true, true, true) // TODO: check if needed
  })
  await knex.raw(onUpdateTrigger('models_users'))

  await knex.schema.createTable('nodes', function (table) {
    table.uuid('id').primary().defaultTo(knex.fn.uuid())
    table.integer('type')
    table.string('name', 255)
    table.jsonb('data')
    table.jsonb('position')
    table.uuid('parentId').references('id').inTable('nodes').onDelete('CASCADE')
    table.integer('height')
    table.integer('width')
    table.uuid('modelsVersionsId').references('id').inTable('models_versions').onDelete('CASCADE')
    table.uuid('ghostParentId').references('id').inTable('nodes').onDelete('CASCADE')
    table.boolean('isParameter').defaultTo(false)
    table.float('parameterMin')
    table.float('parameterMax')
    table.float('parameterStep')
    table.string('description', 255)
    table.string('parameterType', 255)
    table.jsonb('parameterOptions')
    table.boolean('isOutputParameter').defaultTo(false)

    table.timestamps(true, true, true)
  })
  await knex.raw(onUpdateTrigger('nodes'))

  await knex.schema.createTable('edges', function (table) {
    table.uuid('id').primary().defaultTo(knex.fn.uuid())
    table.integer('type')
    table.uuid('sourceId').references('id').inTable('nodes').onDelete('CASCADE')
    table.uuid('targetId').references('id').inTable('nodes').onDelete('CASCADE')
    table.string('sourceHandle', 255)
    table.string('targetHandle', 255)
    table.uuid('modelsVersionsId').references('id').inTable('models_versions').onDelete('CASCADE')
    table.jsonb('points')

    table.timestamps(true, true, true)
  })
  await knex.raw(onUpdateTrigger('edges'))

  await knex.schema.createTable('scenarios', function (table) {
    table.uuid('id').primary().defaultTo(knex.fn.uuid())
    table.string('name', 255)
    table.boolean('isDefault').defaultTo(false)
    table.uuid('modelsVersionsId').references('id').inTable('models_versions').onDelete('CASCADE')

    table.timestamps(true, true, true)
  })
  await knex.raw(onUpdateTrigger('scenarios'))

  await knex.schema.createTable('scenarios_values', function (table) {
    table.uuid('id').primary().defaultTo(knex.fn.uuid())
    table.float('value').notNullable()
    table.uuid('nodesId').references('id').inTable('nodes').onDelete('CASCADE')
    table.uuid('scenariosId').references('id').inTable('scenarios').onDelete('CASCADE')

    table.timestamps(true, true, true)
  })
  await knex.raw(onUpdateTrigger('scenarios_values'))
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('scenarios_values')
  await knex.schema.dropTable('scenarios')
  await knex.schema.dropTable('edges')
  await knex.schema.dropTable('nodes')
  await knex.schema.dropTable('models_users')
  await knex.schema.alterTable('models_versions', function (table) {
    table.dropColumn('modelId')
  })
  await knex.schema.dropTable('models')
  await knex.schema.dropTable('models_versions')
  await knex.schema.dropTable('users')

  await knex.raw('DROP FUNCTION on_update_timestamp')
}
