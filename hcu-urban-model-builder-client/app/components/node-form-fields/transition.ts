import Component from '@glimmer/component';

export interface NodeFormFieldsTransitionSignature {
  // The arguments accepted by the component
  Args: {};
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class NodeFormFieldsTransitionComponent extends Component<NodeFormFieldsTransitionSignature> {
  get triggerTypeOptions() {
    // FIXME: i18n
    return ['Condition', 'Probability', 'Timeout'];
  }
}
