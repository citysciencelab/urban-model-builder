/**
 * Diagnose-Skript: klont eine Modellversion in eine Wegwerf-Version, markiert ALLE
 * Knoten als Output-Parameter, simuliert und loescht den Klon danach wieder.
 * Aendert die Quellversion nicht.
 */
import { app } from '../src/app.js'

const SRC = process.env.VERSION_ID ?? 'e51e89d4-9edd-46b3-944e-56f8a8628a9c'
const knex = app.get('postgresqlClient')

const [{ id: TMP }] = await knex.raw(
  `insert into models_versions (id,"parentId","majorVersion","minorVersion","draftVersion","timeStep",globals,
     "timeUnits","timeStart","timeLength",algorithm,"createdBy","isLatest","customUnits","modelId",notes)
   select gen_random_uuid(), "parentId","majorVersion","minorVersion",9999,"timeStep",globals,"timeUnits",
     "timeStart","timeLength",algorithm,"createdBy",false,"customUnits","modelId",'TEMP PROBE - delete me'
   from models_versions where id = ? returning id`,
  [SRC]
).then((r: any) => r.rows)

try {
  await knex.raw(`create temp table nodemap as select id as old_id, gen_random_uuid() as new_id from nodes where "modelsVersionsId" = ?`, [SRC])

  await knex.raw(
    `insert into nodes (id,type,name,data,position,"parentId",height,width,"modelsVersionsId","ghostParentId",
       "isParameter","parameterMin","parameterMax","parameterStep",description,"parameterType","parameterOptions","isOutputParameter")
     select nm.new_id,n.type,n.name,n.data,n.position,pm.new_id,n.height,n.width,?,gm.new_id,
       n."isParameter",n."parameterMin",n."parameterMax",n."parameterStep",n.description,n."parameterType",n."parameterOptions",true
     from nodes n join nodemap nm on nm.old_id=n.id
       left join nodemap pm on pm.old_id=n."parentId"
       left join nodemap gm on gm.old_id=n."ghostParentId"
     where n."modelsVersionsId" = ?`,
    [TMP, SRC]
  )

  await knex.raw(
    `insert into edges (id,type,"sourceId","targetId","sourceHandle","targetHandle","modelsVersionsId",points)
     select gen_random_uuid(),e.type,sm.new_id,tm.new_id,e."sourceHandle",e."targetHandle",?,e.points
     from edges e join nodemap sm on sm.old_id=e."sourceId" join nodemap tm on tm.old_id=e."targetId"
     where e."modelsVersionsId" = ?`,
    [TMP, SRC]
  )

  const [{ id: SCEN }] = await knex.raw(
    `insert into scenarios (id,name,"isDefault","modelsVersionsId")
     select gen_random_uuid(), s.name, s."isDefault", ? from scenarios s
     where s."modelsVersionsId" = ? and s."isDefault" = true returning id`,
    [TMP, SRC]
  ).then((r: any) => r.rows)

  await knex.raw(
    `insert into scenarios_values (id,value,"nodesId","scenariosId")
     select gen_random_uuid(), sv.value, nm.new_id, ?
     from scenarios_values sv
       join scenarios s on s.id = sv."scenariosId"
       join nodemap nm on nm.old_id = sv."nodesId"
     where s."modelsVersionsId" = ? and s."isDefault" = true`,
    [SCEN, SRC]
  )

  // Zusatz-Sonden: Mean() ueber Agenteneigenschaften, als Modellknoten injiziert.
  // EXTRA="Population Mietende:Kaltmiete_Haushalt,Population Vermietende:Eigenanteil"
  if (process.env.EXTRA) {
    for (const spec of process.env.EXTRA.split(',')) {
      const [pop, prop] = spec.split(':')
      const probeName = `PROBE_${prop}`
      const [{ id: popId }] = await knex('nodes')
        .where('modelsVersionsId', TMP)
        .where('name', pop)
        .select('id')
      const [{ id: probeId }] = await knex.raw(
        `insert into nodes (id,type,name,data,position,"modelsVersionsId","isParameter","isOutputParameter")
         values (gen_random_uuid(), 1, ?::text, jsonb_build_object('value', ?::text), '{"x": 0, "y": 0}'::jsonb, ?::uuid, false, true)
         returning id`,
        [probeName, `Mean([${pop}].Value([${prop}]))`, TMP]
      ).then((r: any) => r.rows)
      await knex.raw(
        `insert into edges (id,type,"sourceId","targetId","sourceHandle","targetHandle","modelsVersionsId")
         values (gen_random_uuid(), 0, ?, ?, 'source-bottom', 'target-left', ?)`,
        [popId, probeId, TMP]
      )
    }
  }

  const params = await knex('scenarios_values')
    .where('scenariosId', SCEN)
    .select('nodesId', 'value')
  const nodeIdToParameterValueMap: Record<string, number> = {}
  for (const r of params) nodeIdToParameterValueMap[r.nodesId] = r.value

  const nodes = await knex('nodes').where('modelsVersionsId', TMP).select('id', 'name', 'parentId')
  const nameById = new Map<string, string>(nodes.map((n: any) => [n.id, n.name]))
  const parentById = new Map<string, string | null>(nodes.map((n: any) => [n.id, n.parentId]))

  const result: any = await app.service('models').simulate({ id: TMP, nodeIdToParameterValueMap } as any)
  const times: number[] = result.times

  const fmt = (v: any): string => {
    if (typeof v === 'number') return v.toFixed(2)
    if (Array.isArray(v)) {
      const nums = v.filter((x) => typeof x === 'number') as number[]
      if (!nums.length) return `[len ${v.length}]`
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length
      return `mean ${mean.toFixed(2)} (n=${nums.length})`
    }
    return String(v)
  }

  const filter = process.env.PROBE ? process.env.PROBE.split(',') : null
  const lines: string[] = []
  for (const [nodeId, data] of Object.entries<any>(result.nodes)) {
    const name = nameById.get(nodeId) ?? nodeId
    if (filter && !name.startsWith('PROBE_') && !filter.some((f) => name.includes(f))) continue
    const agent = parentById.get(nodeId) ? '  [agent]' : ''
    const s = data.series
    lines.push(`${name.padEnd(38)} ${String(times[0])}: ${fmt(s[0]).padEnd(22)} ${String(times[times.length - 1])}: ${fmt(s[s.length - 1]).padEnd(22)}${agent}`)
  }
  lines.sort()
  console.log(lines.join('\n'))
} finally {
  await knex.raw(`delete from models_versions where id = ?`, [TMP])
  console.log('\n[temp version removed]')
}

process.exit(0)
