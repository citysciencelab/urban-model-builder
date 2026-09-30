import { SimulationAdapter } from 'hcu-urban-model-builder-backend';
import type { SimulationModelData } from 'hcu-urban-model-builder-backend';

type StartMessage = {
  type: 'start';
  modelVersionId: string;
  scenario: Record<string, number>;
  runCount: number;
  snapshot: SimulationModelData;
};

self.onmessage = async (event: MessageEvent<StartMessage>) => {
  if (event.data.type !== 'start') return;

  const { modelVersionId, runCount, scenario, snapshot } = event.data;
  const scenarioValues = new Map(Object.entries(scenario));
  const results: unknown[] = [];
  const startedAt = performance.now();

  try {
    for (let index = 0; index < runCount; index += 1) {
      // Passing `snapshot` as SimulationAdapter's inMemoryData makes it read
      // the model/nodes/edges directly from the in-memory snapshot instead
      // of calling out to an `app` service - so no mock Feathers app is
      // needed here at all, unlike a hand-rolled one this can't drift out of
      // sync with however the adapter actually queries its data.
      const result = (
        await new SimulationAdapter(
          {} as never,
          modelVersionId,
          scenarioValues,
          console,
          snapshot,
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
