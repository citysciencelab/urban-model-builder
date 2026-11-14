import Component from '@glimmer/component';
import { service } from '@ember/service';
import { cached } from '@glimmer/tracking';
import { TrackedAsyncData } from 'ember-async-data';
import type IntlService from 'ember-intl/services/intl';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';
import {
  summarizeNodes,
  type ModelSummary,
  type SummaryNode,
} from 'hcu-urban-model-builder-client/utils/model-summary';

export interface LibraryModelSummarySignature {
  Args: {
    /** The model version whose graph is summarised. */
    versionId: string | null;
  };
  Blocks: {
    default: [graph: LibraryModelSummaryComponent];
  };
}

// Only what thumbnail and node-mix bar need, not the whole node records.
const SUMMARY_FIELDS = [
  'id',
  'type',
  'position',
  'parentId',
  'width',
  'height',
] as const;
const MAX_NODES = 1000;

/**
 * Loads a slim list of a version's nodes and yields its summary (node count,
 * node mix, thumbnail shapes) to the Library card or table row.
 *
 * The nodes are read from the Feathers service directly, not through the
 * store: partial records must not end up in the store the editor works on.
 * This costs one small request per visible model. If the Library grows, the
 * summary should move into the `models` service of the backend.
 */
export default class LibraryModelSummaryComponent extends Component<LibraryModelSummarySignature> {
  @service declare feathers: FeathersService;
  @service declare intl: IntlService;

  @cached
  get request() {
    const { versionId } = this.args;
    return new TrackedAsyncData(
      versionId ? this.load(versionId) : Promise.resolve(null),
    );
  }

  get isLoading() {
    return this.request.isPending;
  }

  get summary(): ModelSummary | null {
    return this.request.isResolved ? this.request.value : null;
  }

  /** "SD 88 % · GEO 12 %": the mix in words, so colour is never the only cue. */
  get caption() {
    const paradigms = this.summary?.paradigms ?? [];
    if (this.summary && paradigms.length === 0) {
      return this.intl.t('components.library.node_mix_empty');
    }
    return paradigms
      .map(
        ({ paradigm, percent }) =>
          `${this.intl.t(`components.library.paradigm_short.${paradigm}`)} ${percent} %`,
      )
      .join(' · ');
  }

  get ariaLabel() {
    const parts = (this.summary?.paradigms ?? []).map(({ paradigm, percent }) =>
      this.intl.t('components.library.paradigm_percent', {
        name: this.intl.t(`components.library.paradigm.${paradigm}`),
        percent,
      }),
    );
    return this.intl.t('components.library.node_mix', {
      parts: parts.join(', '),
    });
  }

  private async load(versionId: string): Promise<ModelSummary | null> {
    try {
      const result = (await this.feathers.app.service('nodes').find({
        query: {
          modelsVersionsId: versionId,
          $select: [...SUMMARY_FIELDS],
          $limit: MAX_NODES,
        },
      })) as unknown as { data: SummaryNode[] } | SummaryNode[];

      return summarizeNodes(Array.isArray(result) ? result : result.data);
    } catch (error) {
      // The card still works without its summary.
      console.error('Could not load the model summary', error);
      return null;
    }
  }
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'Library::ModelSummary': typeof LibraryModelSummaryComponent;
  }
}
