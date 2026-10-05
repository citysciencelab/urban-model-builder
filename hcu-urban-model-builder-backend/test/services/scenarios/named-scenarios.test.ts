import assert from 'assert'
import type { Params } from '@feathersjs/feathers'
import { app } from '../../../src/app.js'
import { NodeType, Roles } from '../../../src/client.js'

const rejectsWith = (promise: Promise<unknown>, name: string) =>
  assert.rejects(promise, (error: any) => {
    assert.strictEqual(error.name, name)
    return true
  })

describe('named scenarios (presets)', () => {
  let ownerParams: Params
  let collaboratorParams: Params
  let modelsVersionsId: string
  let defaultScenarioId: string
  let parameterIds: string[]

  const database = () => app.get('postgresqlClient')
  const createPreset = (data: Record<string, unknown>, params: Params) =>
    app.service('scenarios').create(
      { name: 'Preset', isDefault: false, modelsVersionsId, ...data } as any,
      params
    )

  before(async () => {
    await database().table('models').del()
    await database().table('users').del()

    const owner = await app.service('users').create({ email: 'presets-owner@example.com' })
    const collaborator = await app.service('users').create({ email: 'presets-collaborator@example.com' })
    ownerParams = { user: owner, authenticated: true, provider: 'socketio' }
    collaboratorParams = { user: collaborator, authenticated: true, provider: 'socketio' }

    // Created as an external call, so the owner role and the first draft version are set up as in the app.
    const model = await app.service('models').create({ internalName: 'Presets' }, ownerParams)
    modelsVersionsId = (await app.service('models').get(model.id, { user: owner })).latestDraftVersionId!
    await app
      .service('models-users')
      .create({ modelId: model.id, userId: collaborator.id, role: Roles.collaborator })

    // In the app, the default scenario and its values are set up when a client
    // patches a node into a parameter; internally created nodes skip that.
    defaultScenarioId = (
      await app.service('scenarios').create({ name: 'Default', isDefault: true, modelsVersionsId })
    ).id
    parameterIds = []
    for (const name of ['Rate', 'Share']) {
      const node = await app.service('nodes').create({
        modelsVersionsId,
        name,
        type: NodeType.Variable,
        data: { value: '1' },
        position: { x: 0, y: 0 },
        height: null,
        width: null,
        parentId: null,
        isParameter: true,
        isOutputParameter: false
      } as any)
      parameterIds.push(node.id)
      await app
        .service('scenarios-values')
        .create({ scenariosId: defaultScenarioId, nodesId: node.id, value: 1 })
    }
  })

  after(async () => {
    await database().table('models').del()
  })

  it('stores a preset together with its values', async () => {
    const preset = await createPreset(
      {
        values: [
          { nodesId: parameterIds[0], value: 2 },
          { nodesId: parameterIds[1], value: 0.5 }
        ]
      },
      ownerParams
    )
    const values = await database()('scenarios_values').where({ scenariosId: preset.id }).orderBy('value')

    assert.strictEqual(preset.isDefault, false)
    assert.deepStrictEqual(
      values.map((value: any) => [value.nodesId, value.value]),
      [
        [parameterIds[1], 0.5],
        [parameterIds[0], 2]
      ]
    )
  })

  it('stores nothing if a value does not belong to the model version', async () => {
    const before = await database()('scenarios').where({ modelsVersionsId }).count('* as count')

    await rejectsWith(
      createPreset(
        {
          name: 'Broken',
          values: [
            { nodesId: parameterIds[0], value: 1 },
            { nodesId: '00000000-0000-4000-8000-000000000000', value: 1 }
          ]
        },
        ownerParams
      ),
      'BadRequest'
    )
    const after = await database()('scenarios').where({ modelsVersionsId }).count('* as count')

    assert.deepStrictEqual(after, before)
  })

  it('rejects two values for the same node', async () => {
    await rejectsWith(
      createPreset(
        {
          values: [
            { nodesId: parameterIds[0], value: 1 },
            { nodesId: parameterIds[0], value: 2 }
          ]
        },
        ownerParams
      ),
      'BadRequest'
    )
  })

  it('lets only the owner create and delete presets', async () => {
    await rejectsWith(createPreset({ values: [] }, collaboratorParams), 'Forbidden')

    const preset = await createPreset({ values: [] }, ownerParams)
    await rejectsWith(app.service('scenarios').remove(preset.id, collaboratorParams), 'Forbidden')
    await app.service('scenarios').remove(preset.id, ownerParams)
  })

  it('lets only the owner change the values of a preset', async () => {
    const preset = await createPreset({ values: [{ nodesId: parameterIds[0], value: 3 }] }, ownerParams)
    const [value] = await database()('scenarios_values').where({ scenariosId: preset.id })

    await rejectsWith(
      app.service('scenarios-values').patch(value.id, { value: 4 }, collaboratorParams),
      'Forbidden'
    )
    const patched = (await app.service('scenarios-values').patch(value.id, { value: 4 }, ownerParams)) as any
    assert.strictEqual(patched.value, 4)
  })

  it('still lets collaborators change the default scenario of a draft', async () => {
    const [value] = await database()('scenarios_values').where({ scenariosId: defaultScenarioId })

    const patched = (await app.service('scenarios-values').patch(value.id, { value: 7 }, collaboratorParams)) as any
    assert.strictEqual(patched.value, 7)
  })

  it('does not let a patch turn a preset into the default scenario', async () => {
    const preset = await createPreset({ values: [] }, ownerParams)

    await rejectsWith(app.service('scenarios').patch(preset.id, { isDefault: true }, ownerParams), 'BadRequest')
    await rejectsWith(
      app.service('scenarios').patch(preset.id, { modelsVersionsId: defaultScenarioId }, ownerParams),
      'BadRequest'
    )
    // The client sends whole records; unchanged values are accepted.
    const renamed = await app
      .service('scenarios')
      .patch(preset.id, { name: 'Renamed', isDefault: false, modelsVersionsId }, ownerParams)
    assert.strictEqual(renamed.name, 'Renamed')
  })

  it('does not let a patch move a value into another scenario', async () => {
    const preset = await createPreset({ values: [{ nodesId: parameterIds[0], value: 1 }] }, ownerParams)
    const [value] = await database()('scenarios_values').where({ scenariosId: preset.id })

    await rejectsWith(
      app.service('scenarios-values').patch(value.id, { scenariosId: defaultScenarioId }, ownerParams),
      'BadRequest'
    )
    await rejectsWith(
      app.service('scenarios-values').patch(value.id, { nodesId: parameterIds[1] }, ownerParams),
      'BadRequest'
    )
  })

  it('keeps presets editable on a published version, but not the default scenario', async () => {
    await database()('models_versions').where({ id: modelsVersionsId }).update({ publishedAt: new Date() })
    try {
      const preset = await createPreset({ values: [{ nodesId: parameterIds[0], value: 5 }] }, ownerParams)
      await app.service('scenarios').remove(preset.id, ownerParams)

      const [value] = await database()('scenarios_values').where({ scenariosId: defaultScenarioId })
      await rejectsWith(
        app.service('scenarios-values').patch(value.id, { value: 8 }, ownerParams),
        'Forbidden'
      )
    } finally {
      await database()('models_versions').where({ id: modelsVersionsId }).update({ publishedAt: null })
    }
  })
})
