import Component from '@glimmer/component';
import { action } from '@ember/object';

interface ModelFormModalArgs {
  isOpen: boolean;
  mode: 'create' | 'edit';
  changeset: any;
  importFile: File | null;
  onClose: () => void;
  onSubmit: () => void;
  onImportFileSelected: (event: Event) => void;
}

export default class ModelFormModal extends Component<ModelFormModalArgs> {
  @action
  focusFirstInputElement(element: HTMLElement) {
    element.focus();
  }
}
