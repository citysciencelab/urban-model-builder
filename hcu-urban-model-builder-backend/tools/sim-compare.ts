/** Vergleicht zwei Versionen (oder dieselbe Version mit verschiedenen Reglern) ueber je RUNS
 *  Laeufe und meldet Mittel, Standardfehler und die Abweichung in Standardfehlern.
 *  A=<versions-id> B=<versions-id> [OA="Regler=Wert,..."] [OB="..."] RUNS=n */
import { app } from '../src/app.js'
const knex = app.get('postgresqlClient')
const RUNS = Number(process.env.RUNS ?? 15)

async function setup(V: string, override?: string) {
  const rows = await knex('scenarios_values')
    .join('scenarios', 'scenarios.id', 'scenarios_values.scenariosId')
    .where('scenarios.modelsVersionsId', V).where('scenarios.isDefault', true)
    .select('scenarios_values.nodesId as nodesId', 'scenarios_values.value as value')
  const map: Record<string, number> = {}
  for (const r of rows) map[r.nodesId] = r.value
  const nodes = await knex('nodes').where('modelsVersionsId', V).select('id', 'name')
  const nameById = new Map<string, string>(nodes.map((n: any) => [n.id, n.name]))
  const idByName = new Map<string, string>(nodes.map((n: any) => [n.name, n.id]))
  for (const pair of (override ?? '').split(',').filter(Boolean)) {
    const [name, raw] = pair.split('=').map((s) => s.trim())
    const nid = idByName.get(name)
    if (!nid || !(nid in map)) throw new Error(`"${name}" ist kein Szenario-Parameter in ${V}`)
    map[nid] = Number(raw)
  }
  return { V, map, nameById }
}

async function batch(s: any) {
  const acc = new Map<string, number[]>()
  for (let i = 0; i < RUNS; i++) {
    const res: any = await app.service('models').simulate({ id: s.V, nodeIdToParameterValueMap: s.map } as any)
    for (const [nodeId, d] of Object.entries<any>(res.nodes)) {
      const v = d.series?.[d.series.length - 1]
      if (typeof v !== 'number') continue
      const name = s.nameById.get(nodeId)!
      if (!acc.has(name)) acc.set(name, [])
      acc.get(name)!.push(v)
    }
  }
  return acc
}

const A = await setup(process.env.A!, process.env.OA)
const B = await setup(process.env.B!, process.env.OB)
const ra = await batch(A), rb = await batch(B)

const stat = (x: number[]) => {
  const m = x.reduce((a, b) => a + b, 0) / x.length
  const v = x.reduce((a, b) => a + (b - m) ** 2, 0) / (x.length - 1)
  return { m, se: Math.sqrt(v / x.length) }
}
const fmt = (x: number) => Math.abs(x) >= 1e4 ? x.toExponential(4) : x.toPrecision(6)

console.log(`A = ${process.env.A}  ${process.env.OA ?? '(Default)'}`)
console.log(`B = ${process.env.B}  ${process.env.OB ?? '(Default)'}`)
console.log(`je ${RUNS} Laeufe, Wert im letzten Jahr\n`)
console.log('Groesse'.padEnd(38) + 'A (Mittel ± SE)'.padStart(26) + 'B (Mittel ± SE)'.padStart(26) + '   Δ/SE')
console.log('-'.repeat(100))
for (const name of [...new Set([...ra.keys(), ...rb.keys()])].sort()) {
  const xa = ra.get(name), xb = rb.get(name)
  if (!xa || !xb) { console.log(name.padEnd(38) + (xa ? '  nur in A' : '  nur in B')); continue }
  const sa = stat(xa), sb = stat(xb)
  const se = Math.hypot(sa.se, sb.se)
  const d = sb.m - sa.m
  const z = se > 0 ? (d / se).toFixed(1) : (Math.abs(d) < 1e-12 ? 'ident.' : 'inf')
  console.log(name.padEnd(38)
    + `${fmt(sa.m)} ±${sa.se.toPrecision(3)}`.padStart(26)
    + `${fmt(sb.m)} ±${sb.se.toPrecision(3)}`.padStart(26)
    + `  ${z.padStart(6)}`)
}
process.exit(0)
