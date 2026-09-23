/** Klont die neueste Draft-Version ueber die App-eigene Logik (newDraft) und prueft den Klon
 *  Feld fuer Feld gegen die Quelle. Aendert nichts am Inhalt.
 *
 *    SRC_V=<erwartete Quellversion> node --enable-source-maps --import ./ts-node.register.mjs tools/clone-version.ts
 *
 *  Bricht ab, wenn die neueste Draft-Version nicht SRC_V ist – dann hat jemand anderes geklont.
 */
import { app } from '../src/app.js'

const knex = app.get('postgresqlClient')
const MODEL_ID = 'db17ab9f-8015-4269-888b-2dcca98fd32e'
const SRC = process.env.SRC_V!

const model = await knex('models').where('id', MODEL_ID).first()
if (model.latestDraftVersionId !== SRC) throw new Error(`neueste Draft-Version ist ${model.latestDraftVersionId}, nicht ${SRC}`)
const user = await knex('users').where('id', model.createdBy).first()

await app.service('models').newDraft({ id: MODEL_ID } as any, { user } as any)

const nv = await knex('models_versions').where('modelId', MODEL_ID).orderBy('draftVersion', 'desc').first()
const sv = await knex('models_versions').where('id', SRC).first()
console.log(`neue Version ${nv.id}  draftVersion=${nv.draftVersion}  timeStart=${nv.timeStart} timeLength=${nv.timeLength}`)
if (nv.id === SRC) throw new Error('kein neuer Klon')
// seit 2026-09-16 laeuft das Modell 2025 + 15 Jahre (Hamburger Zukunftsentscheid, Klimaneutralitaet 2040) –
// der Klon muss den Zeitraum der Quelle tragen, nicht einen festen Wert
if (nv.timeStart !== 2025 || nv.timeStart !== sv.timeStart || nv.timeLength !== sv.timeLength) throw new Error('timeStart/timeLength falsch')
for (const f of ['timeStep', 'timeUnits', 'algorithm', 'globals', 'customUnits']) {
  if (JSON.stringify(nv[f]) !== JSON.stringify(sv[f])) throw new Error(`models_versions.${f} weicht ab`)
}

const load = async (v: string) => {
  const nodes = await knex('nodes as n').leftJoin('nodes as p', 'p.id', 'n.parentId')
    .leftJoin('nodes as g', 'g.id', 'n.ghostParentId')
    .where('n.modelsVersionsId', v)
    .select('n.*', knex.raw("coalesce(p.name, '') as pname"), knex.raw("coalesce(g.name, '') as gname"))
  const edges = await knex('edges as e').join('nodes as s', 's.id', 'e.sourceId').join('nodes as t', 't.id', 'e.targetId')
    .where('e.modelsVersionsId', v).select('e.type', 'e.sourceHandle', 'e.targetHandle', 'e.points', 's.name as sn', 't.name as tn')
  const scen = await knex('scenarios_values as sv').join('scenarios as s', 's.id', 'sv.scenariosId')
    .join('nodes as n', 'n.id', 'sv.nodesId').where('s.modelsVersionsId', v)
    .select('s.name as scen', 's.isDefault', 'n.name', 'sv.value')
  return { nodes, edges, scen }
}
const a = await load(SRC), b = await load(nv.id)

const FIELDS = ['data', 'description', 'position', 'width', 'height', 'isParameter', 'isOutputParameter',
  'parameterMin', 'parameterMax', 'parameterStep', 'parameterType', 'parameterOptions', 'gname']
const key = (n: any) => `${n.type}|${n.pname}|${n.name}`
const mb = new Map<string, any>(b.nodes.map((n: any) => [key(n), n]))
let diffs = 0
for (const n of a.nodes) {
  const m = mb.get(key(n))
  if (!m) { diffs++; console.log(`FEHLT im Klon: ${key(n)}`); continue }
  for (const f of FIELDS) {
    if (JSON.stringify(n[f]) !== JSON.stringify(m[f])) { diffs++; console.log(`${key(n)}.${f}: ${JSON.stringify(n[f])} -> ${JSON.stringify(m[f])}`) }
  }
}
if (a.nodes.length !== b.nodes.length) { diffs++; console.log(`Knotenzahl ${a.nodes.length} -> ${b.nodes.length}`) }

const ek = (e: any) => [e.type, e.sn, e.tn, e.sourceHandle, e.targetHandle, JSON.stringify(e.points)].join('|')
const ea = a.edges.map(ek).sort(), eb = b.edges.map(ek).sort()
if (JSON.stringify(ea) !== JSON.stringify(eb)) { diffs++; console.log(`Kanten weichen ab: ${ea.length} -> ${eb.length}`) }

const sk = (s: any) => `${s.scen}|${s.isDefault}|${s.name}|${s.value}`
const sa = a.scen.map(sk).sort(), sb = b.scen.map(sk).sort()
if (JSON.stringify(sa) !== JSON.stringify(sb)) { diffs++; console.log(`scenarios_values weichen ab: ${sa.length} -> ${sb.length}`) }

console.log(`${b.nodes.length} Knoten, ${b.edges.length} Kanten, ${b.scen.length} scenarios_values – ${diffs} Abweichungen`)
process.exit(diffs ? 1 : 0)
