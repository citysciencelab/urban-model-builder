import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

/**
 * Save state of the editor, shown in the title block ("saving…",
 * "saved 12:41", "not saved").
 *
 * Every write the store sends to the backend passes through the application
 * adapter, which wraps it in `track`. That gives one place that knows whether
 * anything is still on its way, independent of which form or canvas
 * interaction caused it.
 */
export default class SaveStatusService extends Service {
  @tracked pending = 0;
  @tracked lastSavedAt: Date | null = null;
  @tracked hasError = false;

  get isSaving() {
    return this.pending > 0;
  }

  async track<T>(write: Promise<T>): Promise<T> {
    this.pending++;
    try {
      const result = await write;
      this.lastSavedAt = new Date();
      this.hasError = false;
      return result;
    } catch (error) {
      this.hasError = true;
      throw error;
    } finally {
      this.pending--;
    }
  }

  /** Forget the state of the previous model when another one is opened. */
  reset() {
    this.lastSavedAt = null;
    this.hasError = false;
  }
}

declare module '@ember/service' {
  interface Registry {
    'save-status': SaveStatusService;
  }
}
