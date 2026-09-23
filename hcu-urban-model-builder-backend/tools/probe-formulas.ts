/**
 * Formel-Sonden: klont eine Version in eine Wegwerf-Version, injiziert beliebige Modellknoten mit
 * eigener Formel, simuliert und loescht den Klon wieder. Die Quellversion wird nicht veraendert.
 *
 *   VERSION_ID=<versions-id>
 *   PROBES="Name=Formel;;Name=Formel"      neue Output-Knoten auf Modellebene
 *   PATCH="Knoten=Formel;;Knoten=Formel"   Formeln bestehender Knoten im Klon ersetzen (optional)
 *   RETYPE="Knoten=1,Knoten=0"             Knotentyp im Klon aendern, 0 Stock / 1 Variable (optional)
 *   OVERRIDE="Regler=Wert,..."             Szenariowerte ueberlagern (optional)
 *   RUNS=n                                 Laeufe mitteln (Default 1)
 *   YEARS="2025,2026,2030,2040,2050"       ausgegebene Jahre (Default alle 5 Jahre plus 2026)
 *   GLOBALS="..."                          Globals des Klons setzen (optional). ACHTUNG: SetRandSeed(42) macht die Laeufe
 *                                          NICHT reproduzierbar – zweimal derselbe Seed nacheinander ergab in 39 von 56
 *                                          Outputs andere Werte (v0.0.20, gemessen). Fuer Vergleiche weiter Batches.
 *   DUMP=/pfad.json                        alle Output-Serien des letzten Laufs nach Name in eine Datei (optional)
 *
 * Kanten fuer die Sonden entstehen nach derselben Regel wie in den Bauskripten: jede direkte
 * [Referenz] bekommt eine Link-Kante, Referenzen in .Value( / value(x, / .FindState( /
 * .PopulationSize( nicht.
 */
import { app } from '../src/app.js'

const SRC = process.env.VERSION_ID!
const knex = app.get('postgresqlClient')
const RUNS = Number(process.env.RUNS ?? 1)
const split2 = (s?: string) => (s ?? '').split(';;').map((x) => x.trim()).filter(Boolean)
  .map((x) => { const i = x.indexOf('='); return [x.slice(0, i).trim(), x.slice(i + 1).trim()] as [string, string] })

const refsOf = (formula: string) => {
  const out = new Set<string>()
  for (const m of formula.matchAll(/\[([^\]]+)\]/g)) {
    const before = formula.slice(Math.max(0, m.index! - 14), m.index!)
    if (/\.Value\($|value\(\s*x\s*,\s*$|\.FindState\($|\.PopulationSize\($/.test(before)) continue
    out.add(m[1])
  }
  return out
}

const [{ id: TMP }] = await knex.raw(
  `insert into models_versions (id,"parentId","majorVersion","minorVersion","draftVersion","timeStep",globals,
     "timeUnits","timeStart","timeLength",algorithm,"createdBy","isLatest","customUnits","modelId",notes)
   select gen_random_uuid(), "parentId","majorVersion","minorVersion",9998,"timeStep",globals,"timeUnits",
     "timeStart","timeLength",algorithm,"createdBy",false,"customUnits","modelId",'TEMP FORMULA PROBE - delete me'
   from models_versions where id = ? returning id`, [SRC]).then((r: any) => r.rows)

try {
  if (process.env.GLOBALS) await knex('models_versions').where('id', TMP).update({ globals: process.env.GLOBALS })
  await knex.raw(`create temp table if not exists nodemap_fp (old_id uuid, new_id uuid)`)
  await knex.raw(`delete from nodemap_fp`)
  await knex.raw(`insert into nodemap_fp select id, gen_random_uuid() from nodes where "modelsVersionsId" = ?`, [SRC])
  await knex.raw(
    `insert into nodes (id,type,name,data,position,"parentId",height,width,"modelsVersionsId","ghostParentId",
       "isParameter","parameterMin","parameterMax","parameterStep",description,"parameterType","parameterOptions","isOutputParameter")
     select nm.new_id,n.type,n.name,n.data,n.position,pm.new_id,n.height,n.width,?,gm.new_id,
       n."isParameter",n."parameterMin",n."parameterMax",n."parameterStep",n.description,n."parameterType",n."parameterOptions",n."isOutputParameter"
     from nodes n join nodemap_fp nm on nm.old_id=n.id
       left join nodemap_fp pm on pm.old_id=n."parentId" left join nodemap_fp gm on gm.old_id=n."ghostParentId"
     where n."modelsVersionsId" = ?`, [TMP, SRC])
  await knex.raw(
    `insert into edges (id,type,"sourceId","targetId","sourceHandle","targetHandle","modelsVersionsId",points)
     select gen_random_uuid(),e.type,sm.new_id,tm.new_id,e."sourceHandle",e."targetHandle",?,e.points
     from edges e join nodemap_fp sm on sm.old_id=e."sourceId" join nodemap_fp tm on tm.old_id=e."targetId"
     where e."modelsVersionsId" = ?`, [TMP, SRC])
  const [{ id: SCEN }] = await knex.raw(
    `insert into scenarios (id,name,"isDefault","modelsVersionsId")
     select gen_random_uuid(), s.name, s."isDefault", ? from scenarios s
     where s."modelsVersionsId" = ? and s."isDefault" = true returning id`, [TMP, SRC]).then((r: any) => r.rows)
  await knex.raw(
    `insert into scenarios_values (id,value,"nodesId","scenariosId")
     select gen_random_uuid(), sv.value, nm.new_id, ? from scenarios_values sv
       join scenarios s on s.id = sv."scenariosId" join nodemap_fp nm on nm.old_id = sv."nodesId"
     where s."modelsVersionsId" = ? and s."isDefault" = true`, [SCEN, SRC])

  const nodes0 = await knex('nodes').where('modelsVersionsId', TMP).select('id', 'name', 'type', 'data')
  const idByName = new Map<string, string>(nodes0.map((n: any) => [n.name, n.id]))
  const typeById = new Map<string, number>(nodes0.map((n: any) => [n.id, n.type]))
  const need = (name: string) => { const i = idByName.get(name); if (!i) throw new Error(`Knoten [${name}] nicht gefunden`); return i }

  for (const pair of (process.env.RETYPE ?? '').split(',').filter(Boolean)) {
    const [name, t] = pair.split('=').map((s) => s.trim())
    await knex('nodes').where('id', need(name)).update({ type: Number(t) })
    typeById.set(need(name), Number(t))
  }

  const linkEdges = async (targetId: string, formula: string) => {
    const soll = new Set<string>()
    for (const r of refsOf(formula)) soll.add(need(r))
    const ist = await knex('edges').where({ modelsVersionsId: TMP, targetId, type: 0 }).select('id', 'sourceId')
    for (const e of ist) if (!soll.has(e.sourceId)) await knex('edges').where('id', e.id).del()
    const have = new Set(ist.map((e: any) => e.sourceId))
    for (const s of soll) {
      if (have.has(s)) continue
      await knex('edges').insert({ type: 0, sourceId: s, targetId, modelsVersionsId: TMP,
        sourceHandle: typeById.get(s) === 7 ? 'source-bottom' : 'source-right', targetHandle: 'target-left' })
    }
  }

  for (const [name, formula] of split2(process.env.PATCH)) {
    const nid = need(name)
    const row = nodes0.find((n: any) => n.id === nid)
    await knex('nodes').where('id', nid).update({ data: JSON.stringify({ ...row.data, value: formula }) })
    await linkEdges(nid, formula)
  }

  const probes = split2(process.env.PROBES)
  const probeIds: [string, string][] = []
  for (const [name, formula] of probes) {
    const [ins] = await knex('nodes').insert({ type: 1, name: `PROBE ${name}`, data: JSON.stringify({ value: formula }),
      position: JSON.stringify({ x: 0, y: 0 }), modelsVersionsId: TMP, isParameter: false, isOutputParameter: true }).returning('id')
    const pid = typeof ins === 'string' ? ins : ins.id
    typeById.set(pid, 1)
    probeIds.push([name, pid])
    await linkEdges(pid, formula)
  }

  const params = await knex('scenarios_values').where('scenariosId', SCEN).select('nodesId', 'value')
  const map: Record<string, number> = {}
  for (const r of params) map[r.nodesId] = r.value
  for (const pair of (process.env.OVERRIDE ?? '').split(',').filter(Boolean)) {
    const [name, raw] = pair.split('=').map((s) => s.trim())
    const nid = need(name)
    if (!(nid in map)) throw new Error(`${name} ist kein Parameter`)
    map[nid] = Number(raw)
  }

  const acc = new Map<string, number[][]>()
  let times: number[] = []
  let lastRes: any = null
  const t0 = Date.now()
  for (let r = 0; r < RUNS; r++) {
    const res: any = await app.service('models').simulate({ id: TMP, nodeIdToParameterValueMap: map } as any)
    times = res.times
    lastRes = res
    for (const [name, pid] of probeIds) {
      if (!acc.has(name)) acc.set(name, [])
      acc.get(name)!.push(res.nodes[pid].series)
    }
  }
  if (process.env.DUMP) {
    const all = await knex('nodes').where('modelsVersionsId', TMP).select('id', 'name')
    const nm = new Map<string, string>(all.map((n: any) => [n.id, n.name]))
    const dump: Record<string, unknown> = {}
    for (const [nid, d] of Object.entries<any>(lastRes.nodes)) dump[nm.get(nid)!] = d.series
    ;(await import('node:fs')).writeFileSync(process.env.DUMP, JSON.stringify({ times, series: dump }))
  }
  const years = process.env.YEARS ? process.env.YEARS.split(',').map(Number)
    : times.filter((t) => t === 2026 || (t - 2025) % 5 === 0)
  console.log(`${RUNS} Lauf/Laeufe, ${((Date.now() - t0) / 1000 / RUNS).toFixed(1)} s je Lauf${process.env.OVERRIDE ? `, OVERRIDE ${process.env.OVERRIDE}` : ''}`)
  console.log(''.padEnd(40) + years.map((y) => String(y).padStart(12)).join(''))
  const fmt = (x: number) => (Math.abs(x) >= 1e5 || (Math.abs(x) < 1e-3 && x !== 0)) ? x.toExponential(3) : x.toFixed(4)
  for (const [name] of probeIds) {
    const runs = acc.get(name)!
    const row = years.map((y) => {
      const i = times.indexOf(y)
      const vals = runs.map((s) => s[i]).filter((v) => typeof v === 'number')
      return vals.length ? fmt(vals.reduce((a, b) => a + b, 0) / vals.length) : String(runs[0][i])
    })
    console.log(name.padEnd(40) + row.map((s) => s.padStart(12)).join(''))
  }
} finally {
  await knex.raw(`delete from models_versions where id = ?`, [TMP])
}
process.exit(0)
