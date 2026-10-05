import Service from '@ember/service';
import type { SimulationModelData } from 'hcu-urban-model-builder-backend';
import type {
  ModelValidationRequest,
  ModelValidationResponse,
} from 'hcu-urban-model-builder-client/workers/model-validation';

/** Validation messages keyed by node id; empty when the model is valid. */
export type ModelValidationErrors = Record<string, string>;

/**
 * Runs the editor's model check in a web worker, one check at a time.
 *
 * `validate` resolves with the errors found, or with `null` when a newer
 * request (or `cancel`) superseded the check - its outcome is stale then and
 * must not be applied. If the worker itself fails, no node is marked: the
 * failure only goes to the console.
 */
export default class ModelValidationService extends Service {
  private worker?: Worker;
  private pending?: {
    id: number;
    resolve: (errors: ModelValidationErrors | null) => void;
  };
  private lastRequestId = 0;

  // Separate so tests can replace the worker.
  createWorker(): Worker {
    return new Worker(
      new URL('../workers/model-validation.ts', import.meta.url),
      { type: 'module' },
    );
  }

  validate(
    modelVersionId: string,
    snapshot: SimulationModelData,
  ): Promise<ModelValidationErrors | null> {
    // A check that is still running is outdated now. Stop it instead of
    // letting several simulations of a large model pile up; an idle worker
    // is reused.
    if (this.pending) {
      this.stopWorker(null);
    }
    const worker = this.ensureWorker();
    const id = ++this.lastRequestId;

    return new Promise((resolve) => {
      this.pending = { id, resolve };
      const request: ModelValidationRequest = { id, modelVersionId, snapshot };
      worker.postMessage(request);
    });
  }

  cancel() {
    if (this.pending) {
      this.stopWorker(null);
    }
  }

  willDestroy() {
    super.willDestroy();
    this.stopWorker(null);
  }

  private ensureWorker() {
    if (this.worker) {
      return this.worker;
    }
    const worker = this.createWorker();
    worker.onmessage = (event: MessageEvent<ModelValidationResponse>) => {
      if (worker === this.worker) {
        this.handleResponse(event.data);
      }
    };
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault();
      if (worker === this.worker) {
        console.error('Model validation worker failed:', event.message);
        this.stopWorker({});
      }
    };
    this.worker = worker;
    return worker;
  }

  private handleResponse(response: ModelValidationResponse) {
    if (!this.pending || response.id !== this.pending.id) {
      return;
    }
    const { resolve } = this.pending;
    this.pending = undefined;

    if (response.type === 'invalid') {
      resolve({ [response.nodeId]: response.message });
      return;
    }
    if (response.type === 'failed') {
      console.error('Model validation failed:', response.error);
    }
    resolve({});
  }

  private stopWorker(outcome: ModelValidationErrors | null) {
    this.worker?.terminate();
    this.worker = undefined;
    const pending = this.pending;
    this.pending = undefined;
    pending?.resolve(outcome);
  }
}

// Don't remove this declaration: this is what enables TypeScript to resolve
// this service using `Owner.lookup('service:model-validation')`, as well
// as to check when you pass the service name as an argument to the decorator,
// like `@service('model-validation') declare altName: ModelValidationService;`.
declare module '@ember/service' {
  interface Registry {
    'model-validation': ModelValidationService;
  }
}
