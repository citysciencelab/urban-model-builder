/**
 * Findet Knoten, die niemand mehr liest.
 *
 *   VERSION_ID=<id> node --import ./ts-node.register.mjs tools/find-unused.ts
 *   VERSION_ID=<id> FOLDER="Heizungstechnologie" ... tools/find-unused.ts   # nur ein Ordner, ausfuehrlich
 *
 * ACHTUNG beim Lesen des Ergebnisses: States (type 4) und Transitions (type 5) werden von der
 * Engine ueber den Zustandsautomaten ausgewertet, NICHT ueber [Referenzen]. Sie tauchen in einem
 * reinen Formel-Scan immer als "ungenutzt" auf und sind trotzdem aktiv. Deshalb stehen sie hier
 * getrennt unter "Falsch-Positive". Nie ungeprueft loeschen.
 */
import { app } from '../src/app.js'

const V = process.env.VERSION_ID!
const FOLDER = process.env.FOLDER
const knex = app.get('postgresqlClient')

const nodes = await knex('nodes').where('modelsVersionsId', V)
  .select('id', 'name', 'type', 'parentId', 'ghostParentId', 'data', 'isParameter', 'isOutputParameter')
const edges = await knex('edges').where('modelsVersionsId', V).select('sourceId', 'targetId')
const scen = await knex('scenarios_values')
  .join('scenarios', 'scenarios.id', 'scenarios_values.scenariosId')
  .where('scenarios.modelsVersionsId', V)
  .select('scenarios_values.nodesId as nodesId', 'scenarios_values.value as value')

const byId = new Map(nodes.map((n: any) => [n.id, n]))
const scenBy = new Map(scen.map((r: any) => [r.nodesId, r.value]))
const CONTAINER = [7, 8, 9] // Population, Persona, Ordner
const AUTOMAT = [4, 5]      // State, Transition

const readersOf = (n: any) => nodes.filter((o: any) =>
  o.id !== n.id && typeof o.data?.value === 'string' && o.data.value.includes(`[${n.name}]`))

if (FOLDER) {
  const folder = nodes.find((n: any) => n.name === FOLDER)
  if (!folder) throw new Error(`Ordner nicht gefunden: ${FOLDER}`)
  const inFolder = nodes.filter((n: any) => n.parentId === folder.id)
  console.log(`Ordner "${FOLDER}" – ${inFolder.length} Knoten\n`)
  for (const n of inFolder) {
    const r = readersOf(n)
    console.log(`── ${n.name}`)
    console.log(`   Formel      : ${n.data?.value ?? '(keine)'}`)
    console.log(`   Parameter   : ${n.isParameter ? `ja (Szenariowert ${scenBy.get(n.id)})` : 'nein'}${n.isOutputParameter ? ' | OUTPUT' : ''}`)
    console.log(`   gelesen von : ${r.length ? r.map((x: any) => x.name).join(', ') : '>>> NIEMAND <<<'}`)
    console.log(`   Kanten raus : ${edges.filter((e: any) => e.sourceId === n.id).map((e: any) => byId.get(e.targetId)?.name).join(', ') || '–'}`)
    console.log(`   Kanten rein : ${edges.filter((e: any) => e.targetId === n.id).map((e: any) => byId.get(e.sourceId)?.name).join(', ') || '–'}`)
    console.log(`   Ghosts      : ${nodes.filter((o: any) => o.ghostParentId === n.id).map((o: any) => o.name).join(', ') || '–'}`)
    console.log()
  }
  process.exit(0)
}

const echt: string[] = []
const falschPositiv: string[] = []
const versteckteIndikatoren: string[] = []
for (const n of nodes) {
  if (CONTAINER.includes(n.type) || n.isOutputParameter) continue
  if (readersOf(n).length) continue
  const ort = n.parentId ? byId.get(n.parentId)?.name : 'Modellebene'
  const zeile = `  ${n.name.padEnd(30)} type=${n.type}  in: ${ort}` +
    (n.isParameter ? '  [SLIDER – in der UI bedienbar, wirkt aber auf nichts]' : '')

  if (AUTOMAT.includes(n.type)) falschPositiv.push(zeile)
  // Aggregiert ueber eine Population => Indikator, dem nur das Output-Haekchen fehlt
  else if (typeof n.data?.value === 'string' && n.data.value.includes('[Population ')) {
    versteckteIndikatoren.push(zeile)
  } else echt.push(zeile)
}

console.log('=== Ohne Abnehmer und kein Output – Loeschkandidaten ===')
console.log(echt.join('\n') || '  (keine)')
console.log('\n=== Indikatoren ohne Output-Haekchen: NICHT loeschen, Haekchen setzen ===')
console.log('    (aggregieren ueber eine Population, landen aber in keinem Chart –')
console.log('     kann auch heissen, dass jemand den Output in der UI bewusst abgewaehlt hat)')
console.log(versteckteIndikatoren.join('\n') || '  (keine)')
console.log('\n=== Falsch-Positive: States/Transitions, ueber den Zustandsautomaten aktiv ===')
console.log(falschPositiv.join('\n') || '  (keine)')
process.exit(0)
