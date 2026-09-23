/** Mittelt Indikatoren ueber mehrere Laeufe (Rauschen bei 300 Agenten ist erheblich). */
import { app } from '../src/app.js'

const V = process.env.VERSION_ID!
const RUNS = Number(process.env.RUNS ?? 5)
const knex = app.get('postgresqlClient')

const rows = await knex('scenarios_values')
  .join('scenarios', 'scenarios.id', 'scenarios_values.scenariosId')
  .where('scenarios.modelsVersionsId', V)
  .where('scenarios.isDefault', true)
  .select('scenarios_values.nodesId as nodesId', 'scenarios_values.value as value')
const nodeIdToParameterValueMap: Record<string, number> = {}
for (const r of rows) nodeIdToParameterValueMap[r.nodesId] = r.value

const nodes = await knex('nodes').where('modelsVersionsId', V).select('id', 'name')
const nameById = new Map<string, string>(nodes.map((n: any) => [n.id, n.name]))

// OVERRIDE="Name=Wert,Name=Wert" ueberlagert einzelne Szenariowerte, ohne die Version
// anzufassen. Damit lassen sich Szenarien headless vergleichen, solange der Client nur
// das Default-Szenario kennt.
if (process.env.OVERRIDE) {
  const idByName = new Map<string, string>(nodes.map((n: any) => [n.name, n.id]))
  for (const pair of process.env.OVERRIDE.split(',')) {
    const [name, raw] = pair.split('=').map((s) => s.trim())
    const nodeId = idByName.get(name)
    if (!nodeId) throw new Error(`OVERRIDE: Knoten "${name}" existiert nicht`)
    if (!(nodeId in nodeIdToParameterValueMap)) throw new Error(`OVERRIDE: "${name}" ist kein Szenario-Parameter`)
    nodeIdToParameterValueMap[nodeId] = Number(raw)
    console.log(`OVERRIDE ${name} = ${raw}`)
  }
}

const acc = new Map<string, { first: number[]; last: number[] }>()
let times: number[] = []

for (let i = 0; i < RUNS; i++) {
  const res: any = await app.service('models').simulate({ id: V, nodeIdToParameterValueMap } as any)
  times = res.times
  for (const [nodeId, d] of Object.entries<any>(res.nodes)) {
    const s = d.series
    if (typeof s[0] !== 'number') continue
    const name = nameById.get(nodeId)!
    if (!acc.has(name)) acc.set(name, { first: [], last: [] })
    acc.get(name)!.first.push(s[0])
    acc.get(name)!.last.push(s[s.length - 1])
  }
}

const stat = (a: number[]) => {
  const m = a.reduce((x, y) => x + y, 0) / a.length
  const sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length)
  return { m, sd }
}

const out = [...acc.entries()].sort().map(([name, v]) => {
  const f = stat(v.first)
  const l = stat(v.last)
  return `${name.padEnd(34)} ${times[0]}: ${f.m.toFixed(2).padStart(14)} ±${f.sd.toFixed(2).padEnd(10)}  ${times[times.length - 1]}: ${l.m.toFixed(2).padStart(14)} ±${l.sd.toFixed(2)}`
})
console.log(`Mittel über ${RUNS} Läufe\n`)
console.log(out.join('\n'))
process.exit(0)
