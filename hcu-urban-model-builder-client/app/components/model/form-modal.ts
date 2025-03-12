import Component from '@glimmer/component';
import { action } from '@ember/object';

interface ModelFormModalArgs {
  isOpen: boolean;
  mode: 'create' | 'edit';
  changeset: any;
  onClose: () => void;
  onSubmit: () => void;
}

export default class ModelFormModal extends Component<ModelFormModalArgs> {
  @action
  focusFirstInputElement(element: HTMLElement) {
    element.focus();
  }
}
