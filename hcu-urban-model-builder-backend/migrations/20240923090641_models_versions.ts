import type { Knex } from 'knex'
import { onUpdateTrigger } from '../knexfile.js'
import * as crypto from 'crypto'

/// UP ///
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('models_versions', (table) => {
    table.increments('id')

    table.integer('modelId')
    table.integer('parentId')

    table.text('notes')

    table.integer('majorVersion')
    table.integer('minorVersion')
    table.integer('draftVersion')

    table.float('timeStep').nullable()
    table.string('globals').nullable()
    table.string('timeUnits').nullable()
    table.float('timeStart').nullable()
    table.float('timeLength').nullable()
    table.string('algorithm').nullable()

    table.integer('createdBy')
    table.integer('publishedBy').nullable()

    table.dateTime('publishedAt')
    table.dateTime('deletedAt')
    table.timestamps(true, true, true)

    table.foreign('modelId').references('id').inTable('models').onDelete('CASCADE')
    table.foreign('parentId').references('id').inTable('models_versions').onDelete('CASCADE')
    table.foreign('createdBy').references('id').inTable('users').onDelete('CASCADE')
    table.foreign('publishedBy').references('id').inTable('users').onDelete('CASCADE')
  })
  await knex.raw(onUpdateTrigger('models_versions'))

  await knex.schema.alterTable('models', (table) => {
    table.renameColumn('name', 'internalName')

    table.string('publicName')
    table.text('description')

    table.integer('latestPublishedVersionId').nullable()
    table.integer('latestDraftVersionId').nullable()

    table.integer('currentMinorVersion')
    table.integer('currentMajorVersion')
    table.integer('currentDraftVersion')

    table.uuid('globalUuid')

    table.foreign('latestPublishedVersionId').references('id').inTable('models_versions').onDelete('CASCADE')
    table.foreign('latestDraftVersionId').references('id').inTable('models_versions').onDelete('CASCADE')
  })

  await knex.schema.alterTable('nodes', (table) => {
    table.integer('modelsVersionsId')
    table.foreign('modelsVersionsId').references('id').inTable('models_versions').onDelete('CASCADE')
  })

  await knex.schema.alterTable('edges', (table) => {
    table.integer('modelsVersionsId')
    table.foreign('modelsVersionsId').references('id').inTable('models_versions').onDelete('CASCADE')
  })

  // for each model, create a model version
  const models = await knex('models').select('*')

  for (const model of models) {
    // create the new modelVersions entry
    const [record] = await knex('models_versions')
      .insert({
        modelId: model.id,
        majorVersion: 0,
        minorVersion: 0,
        draftVersion: 0,
        createdBy: model.createdBy,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
        timeStep: model.timeStep,
        globals: model.globals,
        timeUnits: model.timeUnits,
        timeStart: model.timeStart,
        timeLength: model.timeLength,
        algorithm: model.algorithm
      })
      .returning('id')

    const uuid = crypto.randomUUID()

    // update the model with the new uuid
    await knex('models').where('id', model.id).update({
      globalUuid: uuid,
      latestDraftVersionId: record.id,
      currentMinorVersion: 0,
      currentMajorVersion: 0,
      currentDraftVersion: 0
    })

    // update the nodes and edges with the new modelVersionsId
    await knex('nodes').where('modelId', model.id).update({
      modelsVersionsId: record.id
    })

    await knex('edges').where('modelId', model.id).update({
      modelsVersionsId: record.id
    })
  }

  await knex.schema.alterTable('nodes', (table) => {
    table.dropColumn('modelId')
  })

  await knex.schema.alterTable('edges', (table) => {
    table.dropColumn('modelId')
  })

  await knex.schema.alterTable('models', (table) => {
    table.dropColumn('timeStep')
    table.dropColumn('globals')
    table.dropColumn('timeUnits')
    table.dropColumn('timeStart')
    table.dropColumn('timeLength')
    table.dropColumn('algorithm')
  })
}

/// DOWN ///
export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('edges', (table) => {
    table.integer('modelId')
    table.foreign('modelId').references('id').inTable('models').onDelete('CASCADE')
  })

  await knex.schema.alterTable('nodes', (table) => {
    table.integer('modelId')
    table.foreign('modelId').references('id').inTable('models').onDelete('CASCADE')
  })

  await knex.schema.alterTable('models', (table) => {
    table.float('timeStep').nullable()
    table.string('globals').nullable()
    table.string('timeUnits').nullable()
    table.float('timeStart').nullable()
    table.float('timeLength').nullable()
    table.string('algorithm').nullable()
    table.renameColumn('internalName', 'name')
  })

  const models = await knex('models').select('*')

  for (const model of models) {
    const modelVersion = await knex('models_versions').where('id', model.latestDraftVersionId).first()

    await knex('nodes').where('modelsVersionsId', model.latestDraftVersionId).update({
      modelId: modelVersion.modelId
    })

    await knex('edges').where('modelsVersionsId', model.latestDraftVersionId).update({
      modelId: modelVersion.modelId
    })

    await knex('models').where('id', model.id).update({
      timeStep: modelVersion.timeStep,
      globals: modelVersion.globals,
      timeUnits: modelVersion.timeUnits,
      timeStart: modelVersion.timeStart,
      timeLength: modelVersion.timeLength,
      algorithm: modelVersion.algorithm
    })
  }

  await knex.schema.alterTable('models', (table) => {
    table.dropColumn('globalUuid')
    table.dropColumn('currentDraftVersion')
    table.dropColumn('currentMajorVersion')
    table.dropColumn('currentMinorVersion')
    table.dropColumn('latestDraftVersionId')
    table.dropColumn('latestPublishedVersionId')
    table.dropColumn('description')
    table.dropColumn('publicName')
  })

  await knex.schema.alterTable('edges', (table) => {
    table.dropColumn('modelsVersionsId')
  })

  await knex.schema.alterTable('nodes', (table) => {
    table.dropColumn('modelsVersionsId')
  })

  await knex.schema.dropTable('models_versions')
}
