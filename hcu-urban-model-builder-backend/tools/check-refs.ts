/** Prueft, ob alle [Referenzen] in den Formeln einer Version aufloesen, meldet doppelte Namen und
 *  Stocks, deren Startwert (auch indirekt) einen Zufallsstock liest. */
import { app } from '../src/app.js'

const V = process.env.VERSION_ID!
const knex = app.get('postgresqlClient')

const nodes = await knex('nodes').where('modelsVersionsId', V).select('id', 'name', 'type', 'data', 'parentId')
const names = new Set<string>(nodes.map((n: any) => n.name))

const dupes = new Map<string, number>()
for (const n of nodes) dupes.set(n.name, (dupes.get(n.name) ?? 0) + 1)

let problems = 0
for (const n of nodes) {
  const formula: string | undefined = n.data?.value
  if (!formula) continue
  for (const m of formula.matchAll(/\[([^\]]+)\]/g)) {
    if (!names.has(m[1])) {
      console.log(`FEHLT   ${n.name.padEnd(34)} -> [${m[1]}]`)
      problems++
    }
  }
}

// Stock-Startwerte duerfen keinen Zufallsstock lesen – auch nicht ueber Variablen oder Populationen.
// Die Engine zieht einen vorzeitig gelesenen Stock sonst ein zweites Mal (setAgentInitialValues ruft
// setInitialValue() fuer jeden Stock erneut auf), und der lesende Stock behaelt die erste Ziehung.
// So passte bis v0.0.18 bei 59 % der Haushalte Kaltmiete_pro_m2 nicht zur eigenen Wohnung.
const byName = new Map<string, any>(nodes.map((n: any) => [n.name, n]))
const isRandomStock = (n: any) => n.type === 0 && /\bRand\w*\(/.test(n.data?.value ?? '')
let stockProblems = 0
for (const s of nodes.filter((n: any) => n.type === 0)) {
  const seen = new Set<string>([s.name])
  const path = new Map<string, string>()
  const queue: string[] = [s.name]
  while (queue.length) {
    const cur = byName.get(queue.shift()!)
    for (const m of ((cur?.data?.value ?? '') as string).matchAll(/\[([^\]]+)\]/g)) {
      const r = byName.get(m[1])
      if (!r || seen.has(r.name)) continue
      seen.add(r.name)
      path.set(r.name, cur.name)
      if (isRandomStock(r)) {
        const chain = [r.name]
        for (let p = cur.name; p !== s.name; p = path.get(p)!) chain.unshift(p)
        console.log(`STOCK   ${s.name.padEnd(34)} liest Zufallsstock ueber ${[s.name, ...chain].join(' -> ')}`)
        stockProblems++
      } else if (r.type !== 0 && r.type !== 7) {
        queue.push(r.name)
      }
    }
  }
}

console.log(`\n${nodes.length} Knoten, ${problems} unaufloesbare Referenzen, ${stockProblems} Stock-Startwerte mit Zufallsstock`)
const d = [...dupes.entries()].filter(([, c]) => c > 1)
if (d.length) {
  console.log('Doppelte Knotennamen:')
  for (const [name, c] of d) console.log(`  ${name} (${c}x)`)
} else {
  console.log('Keine doppelten Knotennamen')
}
process.exit(0)
