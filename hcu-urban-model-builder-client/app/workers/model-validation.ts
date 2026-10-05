import { SimulationAdapter } from 'hcu-urban-model-builder-backend';
import type { SimulationModelData } from 'hcu-urban-model-builder-backend';

export type ModelValidationRequest = {
  id: number;
  modelVersionId: string;
  snapshot: SimulationModelData;
};

export type ModelValidationResponse =
  | { id: number; type: 'ok' }
  | { id: number; type: 'invalid'; nodeId: string; message: string }
  | { id: number; type: 'failed'; error: { name: string; message: string } };

// Runs the editor's model check off the main thread. A full simulation of a
// large agent model blocks for tens of seconds, which made the browser offer
// to stop the page while a model was being opened. Only the outcome is posted
// back - the simulation result itself is never needed here.
self.onmessage = async (event: MessageEvent<ModelValidationRequest>) => {
  const { id, modelVersionId, snapshot } = event.data;
  let response: ModelValidationResponse;

  try {
    await new SimulationAdapter(
      {} as never,
      modelVersionId,
      new Map<string, number>(),
      console,
      snapshot,
    ).simulate();
    response = { id, type: 'ok' };
  } catch (error: unknown) {
    const simulationError = error as {
      name?: string;
      message?: string;
      data?: { nodeId?: string | null };
    };
    if (
      simulationError?.name === 'SimulationError' &&
      simulationError.data?.nodeId
    ) {
      response = {
        id,
        type: 'invalid',
        nodeId: simulationError.data.nodeId,
        message: String(simulationError.message).replace(/<[^>]*>/g, ''),
      };
    } else {
      response = {
        id,
        type: 'failed',
        error: {
          name: simulationError?.name ?? 'Error',
          message: String(simulationError?.message ?? error),
        },
      };
    }
  }

  self.postMessage(response);
};
