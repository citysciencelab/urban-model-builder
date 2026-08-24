-- Idempotent local-development fixtures for the Sub Model feature.
-- Both versions are published and expose inputs via isParameter and outputs
-- via isOutputParameter.  IDs are deliberately stable for easy test setup.

BEGIN;

INSERT INTO models (id, "internalName", "publicName", description, "currentMajorVersion", "currentMinorVersion", "currentDraftVersion")
VALUES
  ('10000000-0000-4000-8000-000000000001', 'workforce-projection-fixture', 'Workforce projection (fixture)', 'A small published workforce model: working-age population grows and retires over time.', 1, 0, 0),
  ('10000000-0000-4000-8000-000000000002', 'senior-care-demand-fixture', 'Senior care demand (fixture)', 'A small published senior-population model with a derived care-demand output.', 1, 0, 0)
ON CONFLICT (id) DO UPDATE SET
  "internalName" = EXCLUDED."internalName",
  "publicName" = EXCLUDED."publicName",
  description = EXCLUDED.description,
  "currentMajorVersion" = EXCLUDED."currentMajorVersion",
  "currentMinorVersion" = EXCLUDED."currentMinorVersion",
  "currentDraftVersion" = EXCLUDED."currentDraftVersion";

INSERT INTO models_versions (
  id, "modelId", "majorVersion", "minorVersion", "draftVersion", "isLatest",
  "timeUnits", "timeStart", "timeLength", "timeStep", algorithm, globals, notes, "publishedAt"
)
VALUES
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 1, 0, 0, true, 'Years', 0, 30, 1, 'Euler', '', 'Local Sub Model fixture', NOW()),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 1, 0, 0, true, 'Years', 0, 30, 1, 'Euler', '', 'Local Sub Model fixture', NOW())
ON CONFLICT (id) DO UPDATE SET
  "modelId" = EXCLUDED."modelId",
  "majorVersion" = EXCLUDED."majorVersion",
  "minorVersion" = EXCLUDED."minorVersion",
  "draftVersion" = EXCLUDED."draftVersion",
  "isLatest" = EXCLUDED."isLatest",
  "timeUnits" = EXCLUDED."timeUnits",
  "timeStart" = EXCLUDED."timeStart",
  "timeLength" = EXCLUDED."timeLength",
  "timeStep" = EXCLUDED."timeStep",
  algorithm = EXCLUDED.algorithm,
  globals = EXCLUDED.globals,
  notes = EXCLUDED.notes,
  "publishedAt" = NOW();

UPDATE models SET
  "latestPublishedVersionId" = CASE id
    WHEN '10000000-0000-4000-8000-000000000001' THEN '20000000-0000-4000-8000-000000000001'::uuid
    WHEN '10000000-0000-4000-8000-000000000002' THEN '20000000-0000-4000-8000-000000000002'::uuid
  END,
  "latestDraftVersionId" = NULL
WHERE id IN ('10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002');

INSERT INTO nodes (
  id, "modelsVersionsId", type, name, description, data, position, width, height,
  "isParameter", "parameterType", "parameterMin", "parameterMax", "parameterStep", "isOutputParameter"
)
VALUES
  -- Workforce projection: two inputs, a stock and two flows. The stock is its output.
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 1, 'Initial Workforce', 'Starting working-age population.', '{"value":"100000","units":"people"}'::jsonb, '{"x":0,"y":0}'::jsonb, 180, 80, true, 'slider', 10000, 1000000, 1000, false),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 1, 'Annual Workforce Growth Rate', 'Net annual workforce growth before retirement.', '{"value":"0.012","units":"1/Year"}'::jsonb, '{"x":0,"y":140}'::jsonb, 200, 80, true, 'slider', -0.05, 0.1, 0.001, false),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 1, 'Average Working Career', 'Average number of years before retirement.', '{"value":"40","units":"Years"}'::jsonb, '{"x":0,"y":280}'::jsonb, 200, 80, true, 'slider', 20, 60, 1, false),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 0, 'Working-Age Population', 'The projected workforce available to the city.', '{"initial":"[Initial Workforce]","type":"Store","nonNegative":true,"units":"people"}'::jsonb, '{"x":500,"y":120}'::jsonb, 220, 110, false, NULL, NULL, NULL, NULL, true),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', 2, 'New Workers', 'Annual entry into the workforce.', '{"rate":"[Working-Age Population]*[Annual Workforce Growth Rate]","nonNegative":true,"units":"people/Year"}'::jsonb, '{"x":280,"y":40}'::jsonb, 180, 80, false, NULL, NULL, NULL, NULL, false),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', 2, 'Retirements', 'Annual exits from the workforce.', '{"rate":"[Working-Age Population]/[Average Working Career]","nonNegative":true,"units":"people/Year"}'::jsonb, '{"x":280,"y":250}'::jsonb, 180, 80, false, NULL, NULL, NULL, NULL, false),

  -- Senior care demand: two inputs, a growing senior population and a derived demand output.
  ('30000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000002', 1, 'Initial Seniors', 'Starting senior population.', '{"value":"25000","units":"people"}'::jsonb, '{"x":0,"y":0}'::jsonb, 180, 80, true, 'slider', 1000, 500000, 1000, false),
  ('30000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000002', 1, 'Annual Senior Growth Rate', 'Annual change in senior population.', '{"value":"0.025","units":"1/Year"}'::jsonb, '{"x":0,"y":140}'::jsonb, 200, 80, true, 'slider', -0.02, 0.1, 0.001, false),
  ('30000000-0000-4000-8000-000000000013', '20000000-0000-4000-8000-000000000002', 1, 'Care Coverage Rate', 'Share of seniors requiring a care place.', '{"value":"0.16","units":"Unitless"}'::jsonb, '{"x":0,"y":280}'::jsonb, 190, 80, true, 'slider', 0, 1, 0.01, false),
  ('30000000-0000-4000-8000-000000000014', '20000000-0000-4000-8000-000000000002', 0, 'Senior Population', 'Projected city senior population.', '{"initial":"[Initial Seniors]","type":"Store","nonNegative":true,"units":"people"}'::jsonb, '{"x":500,"y":80}'::jsonb, 200, 110, false, NULL, NULL, NULL, NULL, true),
  ('30000000-0000-4000-8000-000000000015', '20000000-0000-4000-8000-000000000002', 2, 'New Seniors', 'Annual growth in the senior population.', '{"rate":"[Senior Population]*[Annual Senior Growth Rate]","nonNegative":true,"units":"people/Year"}'::jsonb, '{"x":280,"y":30}'::jsonb, 180, 80, false, NULL, NULL, NULL, NULL, false),
  ('30000000-0000-4000-8000-000000000016', '20000000-0000-4000-8000-000000000002', 1, 'Required Care Places', 'Derived demand for senior-care places.', '{"value":"[Senior Population]*[Care Coverage Rate]","units":"places"}'::jsonb, '{"x":500,"y":280}'::jsonb, 200, 80, false, NULL, NULL, NULL, NULL, true)
ON CONFLICT (id) DO UPDATE SET
  "modelsVersionsId" = EXCLUDED."modelsVersionsId", type = EXCLUDED.type, name = EXCLUDED.name,
  description = EXCLUDED.description, data = EXCLUDED.data, position = EXCLUDED.position,
  width = EXCLUDED.width, height = EXCLUDED.height, "isParameter" = EXCLUDED."isParameter",
  "parameterType" = EXCLUDED."parameterType", "parameterMin" = EXCLUDED."parameterMin",
  "parameterMax" = EXCLUDED."parameterMax", "parameterStep" = EXCLUDED."parameterStep",
  "isOutputParameter" = EXCLUDED."isOutputParameter";

INSERT INTO edges (id, "modelsVersionsId", type, "sourceId", "targetId", "sourceHandle", "targetHandle", points)
VALUES
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 0, '30000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000005', 'source-right', 'target-1', NULL),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 0, '30000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000006', 'source-right', 'target-1', NULL),
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 1, '30000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000004', 'flow-source', 'target-left', NULL),
  ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 1, '30000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000006', 'source-right', 'flow-target', NULL),
  ('40000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000002', 0, '30000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000015', 'source-right', 'target-1', NULL),
  ('40000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000002', 0, '30000000-0000-4000-8000-000000000013', '30000000-0000-4000-8000-000000000016', 'source-right', 'target-left', NULL),
  ('40000000-0000-4000-8000-000000000013', '20000000-0000-4000-8000-000000000002', 1, '30000000-0000-4000-8000-000000000015', '30000000-0000-4000-8000-000000000014', 'flow-source', 'target-left', NULL),
  ('40000000-0000-4000-8000-000000000014', '20000000-0000-4000-8000-000000000002', 0, '30000000-0000-4000-8000-000000000014', '30000000-0000-4000-8000-000000000016', 'source-bottom', 'target-top', NULL)
ON CONFLICT (id) DO UPDATE SET
  "modelsVersionsId" = EXCLUDED."modelsVersionsId", type = EXCLUDED.type,
  "sourceId" = EXCLUDED."sourceId", "targetId" = EXCLUDED."targetId",
  "sourceHandle" = EXCLUDED."sourceHandle", "targetHandle" = EXCLUDED."targetHandle", points = EXCLUDED.points;

COMMIT;
