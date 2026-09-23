/** Zeigt die vollen Zeitreihen ausgewaehlter Outputs (sim-mean zeigt nur erstes/letztes Jahr).
 *  NAMES="A,B,C"  RUNS=n  OVERRIDE="Regler=Wert,..." */
import { app } from '../src/app.js'

const V = process.env.VERSION_ID!
const RUNS = Number(process.env.RUNS ?? 1)
const WANT = (process.env.NAMES ?? '').split(',').map((s) => s.trim()).filter(Boolean)
const knex = app.get('postgresqlClient')

const rows = await knex('scenarios_values')
  .join('scenarios', 'scenarios.id', 'scenarios_values.scenariosId')
  .where('scenarios.modelsVersionsId', V).where('scenarios.isDefault', true)
  .select('scenarios_values.nodesId as nodesId', 'scenarios_values.value as value')
const nodeIdToParameterValueMap: Record<string, number> = {}
for (const r of rows) nodeIdToParameterValueMap[r.nodesId] = r.value

const nodes = await knex('nodes').where('modelsVersionsId', V).select('id', 'name')
const nameById = new Map<string, string>(nodes.map((n: any) => [n.id, n.name]))
const idByName = new Map<string, string>(nodes.map((n: any) => [n.name, n.id]))

if (process.env.OVERRIDE) {
  for (const pair of process.env.OVERRIDE.split(',')) {
    const [name, raw] = pair.split('=').map((s) => s.trim())
    const nodeId = idByName.get(name)
    if (!nodeId || !(nodeId in nodeIdToParameterValueMap)) throw new Error(`OVERRIDE: "${name}" ist kein Szenario-Parameter`)
    nodeIdToParameterValueMap[nodeId] = Number(raw)
  }
  console.log(`OVERRIDE ${process.env.OVERRIDE}`)
}

const acc = new Map<string, number[][]>()
let times: number[] = []
for (let i = 0; i < RUNS; i++) {
  const res: any = await app.service('models').simulate({ id: V, nodeIdToParameterValueMap } as any)
  times = res.times
  for (const [nodeId, d] of Object.entries<any>(res.nodes)) {
    const name = nameById.get(nodeId)!
    if (WANT.length && !WANT.includes(name)) continue
    if (typeof d.series?.[0] !== 'number') continue
    if (!acc.has(name)) acc.set(name, times.map(() => []))
    d.series.forEach((v: number, t: number) => acc.get(name)![t].push(v))
  }
}

const every = Number(process.env.EVERY ?? 5)
const cols = times.map((t, i) => i).filter((i) => i % every === 0 || i === times.length - 1)
console.log(`Mittel ueber ${RUNS} Laeufe\n`)
console.log('Groesse'.padEnd(38) + cols.map((i) => String(times[i]).padStart(11)).join(''))
for (const name of (WANT.length ? WANT : [...acc.keys()].sort())) {
  const s = acc.get(name)
  if (!s) { console.log(name.padEnd(38) + '  (kein Output)'); continue }
  console.log(name.padEnd(38) + cols.map((i) => {
    const m = s[i].reduce((a, b) => a + b, 0) / s[i].length
    return (Math.abs(m) >= 1000 ? m.toFixed(0) : m.toFixed(3)).padStart(11)
  }).join(''))
}
process.exit(0)
