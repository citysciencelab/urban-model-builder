import assert from 'assert'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'
import { app } from '../../src/app.js'
import { NodeType } from '../../src/client.js'
import { callTool, ToolError } from '../../src/model-tools/index.js'
import type { User } from '../../src/services/users/users.js'

const DISTRICTS = [
  { name: 'Altona', einwohner: 270000, flaeche: 78 },
  { name: 'Eimsbüttel', einwohner: 260000, flaeche: 50 },
  { name: 'Bergedorf', einwohner: 130000, flaeche: 155 }
]

async function assertToolError(
  promise: Promise<unknown>,
  code: string,
  messagePattern?: RegExp
): Promise<any> {
  try {
    await promise
  } catch (error: any) {
    assert.ok(error instanceof ToolError, `Expected a ToolError, got ${error}`)
    assert.strictEqual(error.code, code, error.message)
    if (messagePattern) {
      assert.match(error.message, messagePattern)
    }
    return error
  }
  assert.fail(`Expected a ToolError with code ${code}`)
}

describe('model tools: geodata (OGC API Features)', () => {
  const knex = () => app.get('postgresqlClient')
  const originalAllowedHosts = [...app.get('ogc').allowedHosts]
  let user: User
  let modelVersionId: string

  // A stand-in for a geodata service with several datasets, like the Urban Data Platform Hamburg
  let server: Server
  let baseUrl: string
  let requests: string[] = []

  const useEndpoints = (endpoints: unknown[]) =>
    knex()
      .table('models_versions')
      .where({ id: modelVersionId })
      .update({ ogcEndpoints: JSON.stringify(endpoints) })

  before(async () => {
    await knex().table('models').del()
    await knex().table('users').del()
    user = await app.service('users').create({ email: 'geo@example.com' })

    server = createServer((request, response) => {
      const url = new URL(request.url!, 'http://localhost')
      requests.push(url.pathname)
      const json = (body: unknown, status = 200) => {
        response.writeHead(status, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify(body))
      }
      const path = url.pathname.replace(/^\/datasets/, '')
      if (path === '/' || path === '') {
        json({
          apis: [
            {
              id: 'bevoelkerung',
              title: 'Bevölkerung nach Bezirken',
              description: 'Einwohnerzahlen der Bezirke'
            },
            { id: 'verkehr', title: 'Verkehrszählung', description: 'Zählstellen' }
          ]
        })
      } else if (path === '/bevoelkerung/collections') {
        json({
          collections: [{ id: 'bezirke', title: 'Bezirke', description: 'Alle Bezirke', itemCount: 3 }]
        })
      } else if (path === '/bevoelkerung/conformance') {
        json({ conformsTo: [] })
      } else if (path === '/bevoelkerung/collections/bezirke/schema') {
        json({
          properties: {
            name: { type: 'string', title: 'Name' },
            einwohner: { type: 'integer', title: 'Einwohner' },
            flaeche: { type: 'number', title: 'Fläche in km²' },
            geom: { title: 'geom', 'x-ogc-role': 'primary-geometry' }
          }
        })
      } else if (path === '/bevoelkerung/collections/bezirke/items') {
        const limit = Number(url.searchParams.get('limit') ?? 10)
        const features = DISTRICTS.slice(0, limit).map((properties, id) => ({
          id,
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [10, 53.5] },
          properties
        }))
        json({ numberMatched: DISTRICTS.length, numberReturned: features.length, features })
      } else if (path === '/umleitung/collections') {
        response.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data' })
        response.end()
      } else {
        json({ detail: 'not found' }, 404)
      }
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/datasets`
  })

  after(async () => {
    app.get('ogc').allowedHosts = originalAllowedHosts
    await new Promise((resolve) => server.close(resolve))
    await knex().table('models').del()
    await knex().table('users').del()
  })

  beforeEach(async () => {
    requests = []
    app.get('ogc').allowedHosts = [...originalAllowedHosts, new URL(baseUrl).host]
    ;({ modelVersionId } = (await callTool(app, user, 'create_model', { name: 'Districts' })) as any)
    await useEndpoints([
      { id: 'test-api', name: 'Test data', baseUrl, isDefault: true, apiType: 'multi-api' }
    ])
  })

  afterEach(async () => {
    await knex().table('models').del()
  })

  it('finds datasets, collections and their properties', async () => {
    const datasets: any = await callTool(app, user, 'list_ogc_datasets', { modelVersionId, search: 'bevölk' })
    assert.deepStrictEqual(datasets.endpoints, [
      { id: 'test-api', name: 'Test data', isDefault: true, usable: true }
    ])
    assert.deepStrictEqual(
      datasets.datasets.map((dataset: any) => dataset.apiId),
      ['bevoelkerung']
    )
    assert.strictEqual(((await callTool(app, user, 'list_ogc_datasets', { modelVersionId })) as any).total, 2)

    const collections: any = await callTool(app, user, 'list_ogc_collections', {
      modelVersionId,
      apiId: 'bevoelkerung'
    })
    assert.deepStrictEqual(collections.collections, [
      { collectionId: 'bezirke', title: 'Bezirke', description: 'Alle Bezirke', itemCount: 3 }
    ])

    const collection: any = await callTool(app, user, 'describe_ogc_collection', {
      modelVersionId,
      apiId: 'bevoelkerung',
      collectionId: 'bezirke',
      sampleSize: 2
    })
    assert.strictEqual(collection.featureCount, 3)
    assert.deepStrictEqual(
      collection.properties.map((property: any) => [property.name, property.type]),
      [
        ['name', 'string'],
        ['einwohner', 'integer'],
        ['flaeche', 'number'],
        ['geom', 'geometry']
      ]
    )
    assert.deepStrictEqual(collection.sampleFeatures, DISTRICTS.slice(0, 2))

    await assertToolError(
      callTool(app, user, 'list_ogc_collections', { modelVersionId }),
      'invalid_input',
      /apiId/
    )
  })

  it('builds a model on geodata that loads it when the model runs', async () => {
    const patch: any = await callTool(app, user, 'apply_graph_patch', {
      modelVersionId,
      createNodes: [
        {
          ref: 'districts',
          type: 'ogc-api-features',
          name: 'Districts',
          data: {
            apiId: 'bevoelkerung',
            collectionId: 'bezirke',
            query: { properties: ['name', 'einwohner'] },
            dataTransform: { keyProperty: 'name', valueProperties: ['einwohner'] }
          }
        },
        { type: 'variable', name: 'Total', data: { value: 'Sum([Districts])' } },
        { type: 'variable', name: 'Altona', data: { value: '[Districts]{"Altona"}' } },
        { type: 'variable', name: 'Largest', data: { value: 'Max([Districts])' } },
        { type: 'variable', name: 'Count', data: { value: '[Districts].Length()' } },
        { type: 'stock', name: 'Population', data: { value: 'Sum([Districts])' } }
      ]
    })
    assert.deepStrictEqual(patch.issues, [])
    // every node that uses the data got its link from the geodata node
    assert.strictEqual(patch.createdEdges.filter((edge: any) => edge.autoLinked).length, 5)

    const [node] = (
      await app
        .service('nodes')
        .find({ query: { modelsVersionsId: modelVersionId, type: NodeType.OgcApiFeatures } })
    ).data
    assert.strictEqual(node.data.endpointId, 'test-api')
    assert.strictEqual(node.data.baseUrl, baseUrl)
    assert.strictEqual(node.data.apiType, 'multi-api')
    assert.strictEqual(node.data.query?.limit, 1000, 'the defaults of the editor apply')

    const simulation: any = await callTool(app, user, 'simulate', { modelVersionId, maxPoints: 2 })
    const first = (name: string) => simulation.series.find((series: any) => series.name === name).first
    assert.strictEqual(first('Total'), 660000)
    assert.strictEqual(first('Altona'), 270000)
    assert.strictEqual(first('Largest'), 270000)
    assert.strictEqual(first('Count'), 3)
    assert.strictEqual(first('Population'), 660000)
  })

  it('changes which data a geodata node loads', async () => {
    const created: any = await callTool(app, user, 'apply_graph_patch', {
      modelVersionId,
      createNodes: [
        {
          type: 'ogc-api-features',
          name: 'Districts',
          data: {
            apiId: 'bevoelkerung',
            collectionId: 'bezirke',
            dataTransform: { keyProperty: 'name', valueProperties: ['einwohner'] }
          }
        },
        { type: 'variable', name: 'Total', data: { value: 'Sum([Districts])' } }
      ]
    })
    await callTool(app, user, 'apply_graph_patch', {
      modelVersionId,
      updateNodes: [
        {
          id: created.createdNodes[0].id,
          data: { dataTransform: { keyProperty: 'name', valueProperties: ['flaeche'] } }
        }
      ]
    })

    const simulation: any = await callTool(app, user, 'simulate', { modelVersionId })
    assert.strictEqual(simulation.series.find((series: any) => series.name === 'Total').first, 283)
  })

  it('rejects incomplete or impossible geodata nodes', async () => {
    const error = await assertToolError(
      callTool(app, user, 'apply_graph_patch', {
        modelVersionId,
        createNodes: [
          { ref: 'a', type: 'ogc-api-features', name: 'No collection', data: { apiId: 'bevoelkerung' } },
          { ref: 'b', type: 'ogc-api-features', name: 'No dataset', data: { collectionId: 'bezirke' } },
          {
            ref: 'c',
            type: 'ogc-api-features',
            name: 'Unknown endpoint',
            data: { endpointId: 'nope', apiId: 'x', collectionId: 'y' }
          },
          {
            ref: 'd',
            type: 'ogc-api-features',
            name: 'Own URL',
            data: { baseUrl: 'http://169.254.169.254', apiId: 'x', collectionId: 'y' }
          },
          {
            ref: 'ok',
            type: 'ogc-api-features',
            name: 'Fine',
            data: { apiId: 'bevoelkerung', collectionId: 'bezirke' }
          },
          { ref: 'v', type: 'variable', name: 'V', data: { value: '1' } }
        ],
        createEdges: [{ type: 'link', source: 'v', target: 'ok' }]
      }),
      'invalid_input'
    )
    assert.strictEqual(error.details.errors.length, 5)
    assert.match(error.message, /collectionId is required/)
    assert.match(error.message, /apiId is required/)
    assert.match(error.message, /no geodata endpoint "nope"/)
    assert.match(error.message, /unknown data field "baseUrl"/)
    assert.match(error.message, /geodata node has no inputs/)
    assert.strictEqual(
      (await app.service('nodes').find({ query: { modelsVersionsId: modelVersionId } })).total,
      0
    )
  })

  it('only talks to services the server allows', async () => {
    app.get('ogc').allowedHosts = originalAllowedHosts

    const datasets = callTool(app, user, 'list_ogc_datasets', { modelVersionId })
    await assertToolError(datasets, 'forbidden', /not enabled for assistants/)
    await assertToolError(
      callTool(app, user, 'describe_ogc_collection', {
        modelVersionId,
        apiId: 'bevoelkerung',
        collectionId: 'bezirke'
      }),
      'forbidden'
    )
    await assertToolError(
      callTool(app, user, 'apply_graph_patch', {
        modelVersionId,
        createNodes: [
          {
            type: 'ogc-api-features',
            name: 'Districts',
            data: { apiId: 'bevoelkerung', collectionId: 'bezirke' }
          }
        ]
      }),
      'invalid_input',
      /not enabled for assistants/
    )

    // a node a user made in the editor, pointing to a service that is not allowed
    await app.service('nodes').create({
      modelsVersionsId: modelVersionId,
      type: NodeType.OgcApiFeatures,
      name: 'From the editor',
      data: { endpointId: 'test-api', baseUrl, apiId: 'bevoelkerung', collectionId: 'bezirke' },
      position: { x: 0, y: 0 },
      isParameter: false,
      isOutputParameter: false
    })
    await assertToolError(callTool(app, user, 'simulate', { modelVersionId }), 'forbidden')
    assert.deepStrictEqual(requests, [], 'the service was never contacted')
  })

  it('does not follow a service elsewhere and reports services that fail', async () => {
    await assertToolError(
      callTool(app, user, 'list_ogc_collections', { modelVersionId, apiId: 'umleitung' }),
      'external_service_failed'
    )
    assert.deepStrictEqual(requests, ['/datasets/umleitung/collections'])

    await assertToolError(
      callTool(app, user, 'list_ogc_collections', { modelVersionId, apiId: 'gibt-es-nicht' }),
      'external_service_failed'
    )
  })

  it('offers the endpoints of the model version by id', async () => {
    await useEndpoints([
      {
        id: 'other',
        name: 'Other',
        baseUrl: 'https://geodata.example.org/api',
        isDefault: true,
        apiType: 'single-api'
      },
      { id: 'test-api', name: 'Test data', baseUrl, isDefault: false, apiType: 'multi-api' }
    ])

    // the default endpoint of this version is not allowed, the second one is
    await assertToolError(callTool(app, user, 'list_ogc_datasets', { modelVersionId }), 'forbidden')
    const datasets: any = await callTool(app, user, 'list_ogc_datasets', {
      modelVersionId,
      endpointId: 'test-api'
    })
    assert.deepStrictEqual(
      datasets.endpoints.map((endpoint: any) => [endpoint.id, endpoint.usable]),
      [
        ['other', false],
        ['test-api', true]
      ]
    )
    assert.strictEqual(datasets.total, 2)
  })
})
