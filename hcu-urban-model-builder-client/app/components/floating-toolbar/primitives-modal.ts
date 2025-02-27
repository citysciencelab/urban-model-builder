import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';

import { NodeType } from 'hcu-urban-model-builder-backend';
import { decamelize, dasherize } from '@ember/string';
import type EventBus from 'hcu-urban-model-builder-client/services/event-bus';
import type DropdownManagerService from 'hcu-urban-model-builder-client/services/dropdown-manager';

export interface FloatingToolbarPrimitivesModalSignature {
  // The arguments accepted by the component
  Args: {};
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
  type: NodeType;
  icon: keyof typeof NodeIconMap | 'question-circle';
};

export default class FloatingToolbarPrimitivesModalComponent extends Component<FloatingToolbarPrimitivesModalSignature> {
  @service declare eventBus: EventBus;
  @service declare dropdownManager: DropdownManagerService;

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
      type: nodeType,
      icon: NodeIconMap[nodeType] || 'question-circle',
    };
  }

  @action
  toggleDropdown() {
    this.dropdownManager.togglePin('primitivesModal');
  }

  @action onOpen() {
    this.dropdownManager.onOpen('primitivesModal');
    return true;
  }

  @action onClose() {
    return !this.dropdownManager.isPrimitivesDropdownPinned;
  }

  @action onNodeClick(config: NodeTypeConfig) {
    this.eventBus.emit('primitive-modal:create-clicked', config);
    this.dropdownManager.dropdownInstances['primitivesModal']?.actions.close();
  }
}
