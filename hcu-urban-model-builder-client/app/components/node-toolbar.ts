import type Store from '@ember-data/store';
import Component from '@glimmer/component';
import type ModelModel from 'hcu-urban-model-builder-client/models/model';
import { service } from '@ember/service';

import type StoreEventEmitterService from 'hcu-urban-model-builder-client/services/store-event-emitter';
import type ModelDialogsService from 'hcu-urban-model-builder-client/services/model-dialogs';

export interface NodeToolbarSignature {
  // The arguments accepted by the component
  Args: {
    model: ModelModel;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class NodeToolbarComponent extends Component<NodeToolbarSignature> {
  @service declare store: Store;
  @service declare storeEventEmitter: StoreEventEmitterService;
}
