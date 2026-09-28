import { SimulationAdapter } from 'hcu-urban-model-builder-backend';

type SimulationSnapshot = {
  modelVersion: Record<string, unknown>;
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
};

type StartMessage = {
  type: 'start';
  modelVersionId: string;
  scenario: Record<string, number>;
  runCount: number;
  snapshot: SimulationSnapshot;
};

const matches = (
  record: Record<string, unknown>,
  query: Record<string, unknown> = {},
) =>
  Object.entries(query).every(([key, expected]) => {
    if (key.startsWith('$')) return true;
    const actual = record[key];
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      const operator = expected as {
        $ne?: unknown;
        $in?: unknown[];
        $nin?: unknown[];
      };
      if ('$ne' in operator) return actual !== operator.$ne;
      if (operator.$in) return operator.$in.includes(actual);
      if (operator.$nin) return !operator.$nin.includes(actual);
    }
    return actual === expected;
  });

const createSimulationApp = (snapshot: SimulationSnapshot) => ({
  service: (path: string) => {
    if (path === 'models-versions') {
      return { get: async () => snapshot.modelVersion };
    }
    if (path === 'nodes' || path === 'edges') {
      const records = path === 'nodes' ? snapshot.nodes : snapshot.edges;
      return {
        find: async ({ query }: { query?: Record<string, unknown> } = {}) => {
          const data = records.filter((record) => matches(record, query));
          return { data, total: data.length };
        },
      };
    }
    throw new Error(`Unknown local simulation service: ${path}`);
  },
});

self.onmessage = async (event: MessageEvent<StartMessage>) => {
  if (event.data.type !== 'start') return;

  const { modelVersionId, runCount, scenario, snapshot } = event.data;
  const simulationApp = createSimulationApp(snapshot);
  const scenarioValues = new Map(Object.entries(scenario));
  const results: unknown[] = [];
  const startedAt = performance.now();

  try {
    for (let index = 0; index < runCount; index += 1) {
      const result = (
        await new SimulationAdapter(
          simulationApp as never,
          modelVersionId,
          scenarioValues,
        ).simulate()
      ).getResults();
      results.push(result);

      const completed = index + 1;
      const elapsedMs = performance.now() - startedAt;
      self.postMessage({
        type: 'progress',
        completed,
        total: runCount,
        elapsedMs,
        estimatedRemainingMs:
          completed > 0 ? (elapsedMs / completed) * (runCount - completed) : 0,
      });
    }

    self.postMessage({ type: 'complete', results });
  } catch (error: unknown) {
    const workerError =
      error instanceof Error ? error : new Error(String(error));
    const errorData =
      error && typeof error === 'object' && 'data' in error
        ? error.data
        : undefined;
    self.postMessage({
      type: 'error',
      error: {
        name: workerError.name,
        message: workerError.message,
        data: errorData,
        stack: workerError.stack,
      },
    });
  }
};

export {};
