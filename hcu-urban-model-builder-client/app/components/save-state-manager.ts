import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export interface SaveStateManagerSignature {
  // The arguments accepted by the component
  Args: {};
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class SaveStateManagerComponent extends Component<SaveStateManagerSignature> {
  @tracked isSaving = false;
  @tracked isError = false;

  @action async saveAction(asyncCallback: () => Promise<void>) {
    let success = false;
    const intervalId = setInterval(() => {
      if (success) {
        this.isSaving = false;
        clearInterval(intervalId);
      }
    }, 350);

    this.isSaving = true;

    try {
      await asyncCallback();
      success = true;
    } catch (error) {
      this.isError = true;
      this.isSaving = false;
      clearInterval(intervalId);
    }
  }
}
