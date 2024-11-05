import type Store from '@ember-data/store';
import { action } from '@ember/object';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { NodeType } from 'hcu-urban-model-builder-backend';
import type ModelModel from 'hcu-urban-model-builder-client/models/model';
import type EmberReactConnectorService from 'hcu-urban-model-builder-client/services/ember-react-connector';
import type StoreEventEmitterService from 'hcu-urban-model-builder-client/services/store-event-emitter';

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

type NodeTypeConfig = { label: string; className: string; value: NodeType };

export default class NodeToolbarComponent extends Component<NodeToolbarSignature> {
  @service declare store: Store;
  @service declare storeEventEmitter: StoreEventEmitterService;
  @service declare emberReactConnector: EmberReactConnectorService;

  get nodeTypeConfigs() {
    return Object.values(NodeType).reduce((acc, type) => {
      if (typeof type === 'number' && type !== NodeType.Ghost) {
        const typeStr = NodeType[type];
        acc.push({
          label: typeStr.toLocaleUpperCase(),
          className: typeStr.toLowerCase(),
          value: type,
        });
      }
      return acc;
    }, [] as NodeTypeConfig[]);
  }

  @action onDragStart(config: NodeTypeConfig) {
    this.emberReactConnector.draggedNodeConfig = config;
  }

  @action
  async onDragEnd(event: DragEvent) {
    event.preventDefault();
    this.emberReactConnector.draggedNodeConfig = null;
  }
}
