import { action } from '@ember/object';
import Component from '@glimmer/component';

export interface NodeFormFieldsPopulationSignature {
  // The arguments accepted by the component
  Args: {};
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class NodeFormFieldsPopulationComponent extends Component<NodeFormFieldsPopulationSignature> {
  // FIXME: i18n
  readonly geoPlacementTypeOptions = [
    'Custom Function',
    'Ellipse',
    'Grid',
    'Network',
    'Random',
  ];

  // FIXME: i18n
  readonly networkTypeOptions = ['Custom Function', 'None'];
}
