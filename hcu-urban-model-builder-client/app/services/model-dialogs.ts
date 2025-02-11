import { action } from '@ember/object';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class ModelDialogsService extends Service {
  @tracked showPublishModal = false;
  @tracked showSimulateModal = false;

  @tracked showCloneModal = false;
  @tracked showShareModal = false;
  @tracked showSettingsModal = false;

  @action onStartPublish() {
    this.showPublishModal = true;
  }

  @action hidePublishingDialog() {
    this.showPublishModal = false;
  }

  @action onStartClone() {
    this.showCloneModal = true;
  }

  @action onShowSimulateDialog(value: boolean) {
    this.showSimulateModal = value;
  }

  @action onShowSettingsDialog() {
    this.showSettingsModal = true;
  }

  @action hideCloneDialog() {
    this.showCloneModal = false;
  }

  @action onStartShare() {
    this.showShareModal = true;
  }

  @action hideShareDialog() {
    this.showShareModal = false;
  }

  @action hideSettingsDialog() {
    this.showSettingsModal = false;
  }
}

// Don't remove this declaration: this is what enables TypeScript to resolve
// this service using `Owner.lookup('service:model-dialogs')`, as well
// as to check when you pass the service name as an argument to the decorator,
// like `@service('model-dialogs') declare altName: ModelDialogsService;`.
declare module '@ember/service' {
  interface Registry {
    'model-dialogs': ModelDialogsService;
  }
}
