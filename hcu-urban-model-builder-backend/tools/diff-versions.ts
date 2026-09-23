/** Struktureller Formelvergleich zweier Modellversionen.
 *  Das ist der eigentliche Nachweis, dass eine Aenderung nur das Gewollte bewirkt hat –
 *  Batch-Mittel von Randgroessen taugen dafuer nicht (siehe Umsetzung Feedback 6 und 7).
 *  Aufruf: A=<versions-id> B=<versions-id> */
import { app } from '../src/app.js'
const knex = app.get('postgresqlClient')

const load = async (v: string) =>
  knex('nodes as n')
    .leftJoin('nodes as p', 'p.id', 'n.parentId')
    .where('n.modelsVersionsId', v)
    .select('n.name', 'n.type', 'n.data', 'n.isParameter', 'n.isOutputParameter',
      'n.description', knex.raw("coalesce(p.name, '(root)') as parent"))

const a = await load(process.env.A!)
const b = await load(process.env.B!)
const key = (n: any) => `${n.type}|${n.parent}|${n.name}`
const ma = new Map<string, any>(a.map((n: any) => [key(n), n]))
const mb = new Map<string, any>(b.map((n: any) => [key(n), n]))

console.log(`A: ${a.length} Knoten   B: ${b.length} Knoten\n`)

console.log('=== Formeln geaendert ===')
let ch = 0
for (const [k, n] of ma) {
  const m = mb.get(k)
  if (!m) continue
  const fa = n.data?.value ?? '', fb = m.data?.value ?? ''
  if (fa !== fb) { ch++; console.log(`\n  ${n.name}\n    A: ${fa}\n    B: ${fb}`) }
}
console.log(ch ? `\n  => ${ch} geaenderte Formeln` : '  (keine)')

console.log('\n=== Attribute an Bestandsknoten geaendert ===')
let at = 0
for (const [k, n] of ma) {
  const m = mb.get(k)
  if (!m) continue
  for (const f of ['isParameter', 'isOutputParameter', 'description']) {
    if (JSON.stringify(n[f]) !== JSON.stringify(m[f])) {
      at++; console.log(`  ${n.name}.${f}: ${JSON.stringify(n[f])} -> ${JSON.stringify(m[f])}`)
    }
  }
}
if (!at) console.log('  (keine)')

for (const [label, from, to] of [['nur in A (entfernt)', ma, mb], ['nur in B (neu)', mb, ma]] as const) {
  console.log(`\n=== ${label} ===`)
  const only = [...from.keys()].filter((k) => !to.has(k))
  console.log(only.length ? only.map((k) => '  ' + k).join('\n') : '  (keine)')
  if (only.length) console.log(`  => ${only.length}`)
}
process.exit(0)
