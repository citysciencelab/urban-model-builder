import type Store from '@ember-data/store';
import { action } from '@ember/object';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { NodeType } from 'hcu-urban-model-builder-backend';
import type ModelModel from 'hcu-urban-model-builder-client/models/model';
import type EmberReactConnectorService from 'hcu-urban-model-builder-client/services/ember-react-connector';
import type StoreEventEmitterService from 'hcu-urban-model-builder-client/services/store-event-emitter';
import { decamelize, dasherize } from '@ember/string';

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

const NodeIconMap: Record<string, string> = {
  [NodeType.Stock]: 'inventory',
  [NodeType.Variable]: 'category',
  [NodeType.Flow]: 'flow-icon',
  [NodeType.Converter]: 'autorenew',
  [NodeType.State]: 'toggle_off',
  [NodeType.Transition]: 'transition_push',
  [NodeType.Action]: 'play_pause',
  [NodeType.Population]: 'groups',
  [NodeType.Agent]: 'person',
  [NodeType.Folder]: 'folder',
  [NodeType.Ghost]: 'ghost',
  [NodeType.OgcApiFeatures]: 'storage',
};

type NodeTypeConfig = {
  label: string;
  className: string;
  value: NodeType;
  icon: keyof typeof NodeIconMap | 'question-circle';
};

export default class NodeToolbarComponent extends Component<NodeToolbarSignature> {
  @service declare store: Store;
  @service declare storeEventEmitter: StoreEventEmitterService;
  @service declare emberReactConnector: EmberReactConnectorService;

  readonly nodeGroups = [
    {
      name: 'common',
      nodeTypes: [
        NodeType.Variable,
        NodeType.Folder,
        NodeType.Converter,
        NodeType.OgcApiFeatures,
      ],
    },
    {
      name: 'system-dynamics',
      nodeTypes: [NodeType.Stock, NodeType.Flow],
    },
    {
      name: 'agent-based-modelling',
      nodeTypes: [
        NodeType.State,
        NodeType.Transition,
        NodeType.Action,
        NodeType.Population,
        NodeType.Agent,
      ],
    },
  ];

  @action getNodeTypeConfig(nodeType: NodeType): NodeTypeConfig {
    const typeStr = NodeType[nodeType];

    return {
      label: decamelize(typeStr),
      className: dasherize(typeStr),
      value: nodeType,
      icon: NodeIconMap[nodeType] || 'question-circle',
    };
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
