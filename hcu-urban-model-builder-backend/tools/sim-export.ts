/** Batch-Laeufe als JSON-Exporte im Format des Client-Downloads (metadata / scenario / results), fuer den
 *  UMB Output Viewer in outputs/viewer. Die Version wird nicht veraendert.
 *
 *    VERSION_ID=<versions-id>
 *    RUNS=15                          Zahl der Laeufe
 *    OUTDIR=/pfad                     Zielordner (wird angelegt)
 *    NAME="A · Giesskanne"            Szenariobezeichnung, landet in metadata.scenarioName
 *    PREFIX=A_giesskanne              Dateiname: <PREFIX>_lauf01.json …
 *    OVERRIDE="Regler=Wert,…"         Szenariowerte ueberlagern (optional)
 *
 *  Abweichungen vom Client-Export: Agenten der Populationen ohne "location" (der Viewer zaehlt nur
 *  Zustaende, die Dateien werden so rund fuenfmal kleiner), kompaktes JSON, zusaetzliche Felder
 *  metadata.source / scenarioName / run / runs.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from '../src/app.js'

const V = process.env.VERSION_ID!
const RUNS = Number(process.env.RUNS ?? 15)
const OUTDIR = process.env.OUTDIR!
const PREFIX = process.env.PREFIX!
const NAME = process.env.NAME ?? PREFIX
if (!V || !OUTDIR || !PREFIX) throw new Error('VERSION_ID, OUTDIR und PREFIX sind Pflicht')
const knex = app.get('postgresqlClient')

const ver = await knex('models_versions').where('id', V).first()
const model = await knex('models').where('id', ver.modelId).first()
const nodes = await knex('nodes').where('modelsVersionsId', V).select('id', 'name')
const nameById = new Map<string, string>(nodes.map((n: any) => [n.id, n.name]))
const idByName = new Map<string, string>(nodes.map((n: any) => [n.name, n.id]))

const rows = await knex('scenarios_values')
  .join('scenarios', 'scenarios.id', 'scenarios_values.scenariosId')
  .where('scenarios.modelsVersionsId', V)
  .where('scenarios.isDefault', true)
  .select('scenarios_values.nodesId as nodesId', 'scenarios_values.value as value')
const map: Record<string, number> = {}
for (const r of rows) map[r.nodesId] = r.value
for (const pair of (process.env.OVERRIDE ?? '').split(',').filter(Boolean)) {
  const [name, raw] = pair.split('=').map((s) => s.trim())
  const nid = idByName.get(name)
  if (!nid) throw new Error(`OVERRIDE: Knoten "${name}" existiert nicht`)
  if (!(nid in map)) throw new Error(`OVERRIDE: "${name}" ist kein Szenario-Parameter`)
  map[nid] = Number(raw)
}
// float4 aus der DB wie im Client auf eine lesbare Zahl bringen (0.019999999552965164 -> 0.02)
const scenario: Record<string, number> = {}
for (const [nid, v] of Object.entries(map)) scenario[nameById.get(nid)!] = Number(Number(v).toPrecision(7))

mkdirSync(OUTDIR, { recursive: true })
const t0 = Date.now()
for (let r = 1; r <= RUNS; r++) {
  const res: any = await app.service('models').simulate({ id: V, nodeIdToParameterValueMap: map } as any)
  const out: Record<string, { series: unknown[] }> = {}
  for (const [nid, d] of Object.entries<any>(res.nodes)) {
    const series = (d.series as unknown[]).map((step) => Array.isArray(step)
      ? step.map((ag: any) => ({ id: ag.id, state: ag.state }))
      : step)
    out[nameById.get(nid) ?? nid] = { series }
  }
  const doc = {
    metadata: {
      modelId: V, modelName: model.internalName, version: `${ver.majorVersion}.${ver.minorVersion}.${ver.draftVersion}`,
      timeStart: ver.timeStart, timeLength: ver.timeLength, timeEnd: res.times[res.times.length - 1],
      downloadTimestamp: new Date().toISOString(),
      source: 'tools/sim-export.ts (headless)', scenarioName: NAME, run: r, runs: RUNS,
    },
    scenario,
    results: { times: res.times, nodes: out },
  }
  const file = join(OUTDIR, `${PREFIX}_lauf${String(r).padStart(2, '0')}.json`)
  writeFileSync(file, JSON.stringify(doc))
  console.log(`${NAME}: Lauf ${r}/${RUNS} -> ${file} (${((Date.now() - t0) / 1000 / r).toFixed(1)} s je Lauf)`)
}
process.exit(0)
