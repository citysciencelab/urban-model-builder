import type { Application } from '../declarations.js'

type GraphService = 'nodes' | 'edges'

/** Maps placeholder ids of records created earlier in the same batch to their real ids. */
export type IdMap = Map<string, string>

export type BatchOperation =
  | { service: GraphService; method: 'create'; placeholderId: string; data: (ids: IdMap) => any }
  | { service: GraphService; method: 'patch'; id: string; data: (ids: IdMap) => any }
  | { service: GraphService; method: 'remove'; id: string }

type GraphEvent = { service: GraphService; event: 'created' | 'patched' | 'removed'; record: any }

const EVENT_BY_METHOD = { create: 'created', patch: 'patched', remove: 'removed' } as const

/**
 * Runs graph writes in one database transaction and emits the real-time events only after the commit, so that
 * connected editors never see a change that is rolled back afterwards.
 *
 * The writes are internal service calls: schema validation and all other hooks run, but the per-record
 * permission checks do not. The caller must have checked that the user may edit the model version.
 *
 * `cascadedRemovals` are records the database removes implicitly (children, ghosts and edges of removed nodes);
 * their `removed` events are emitted too, because the services do not know about them.
 */
export async function executeBatch(
  app: Application,
  operations: BatchOperation[],
  cascadedRemovals: { service: GraphService; record: any }[] = []
) {
  const trx = await app.get('postgresqlClient').transaction()
  const params: any = { transaction: { trx }, deferEvents: true }
  const ids: IdMap = new Map()
  const events: GraphEvent[] = []

  try {
    for (const operation of operations) {
      const service = app.service(operation.service) as any
      let record
      if (operation.method === 'create') {
        record = await service.create(operation.data(ids), params)
        ids.set(operation.placeholderId, record.id)
      } else if (operation.method === 'patch') {
        record = await service.patch(operation.id, operation.data(ids), params)
      } else {
        record = await service.remove(operation.id, params)
      }
      events.push({ service: operation.service, event: EVENT_BY_METHOD[operation.method], record })
    }
    await trx.commit()
  } catch (error) {
    await trx.rollback()
    throw error
  }

  events.push(...cascadedRemovals.map((removal) => ({ ...removal, event: 'removed' as const })))

  for (const { service: serviceName, event, record } of events) {
    const service = app.service(serviceName)
    // the second argument stands in for the hook context that publishers and listeners expect
    service.emit(event, record, { app, service, path: serviceName, params: {}, result: record })
  }

  return {
    ids,
    records: events.slice(0, operations.length).map((event) => event.record)
  }
}
