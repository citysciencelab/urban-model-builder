import { action } from '@ember/object';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

type DropdownNames = 'simulateModal' | 'primitivesModal';
type EmberBasicDropdownAPI = { actions: { close: () => void } };

export default class DropdownManagerService extends Service {
  dropdownInstances: Partial<Record<DropdownNames, EmberBasicDropdownAPI>> = {};
  @tracked isSimulateDropdownPinned = false;
  @tracked isPrimitivesDropdownPinned = false;

  @action registerInstance(name: DropdownNames, instance: any) {
    this.dropdownInstances[name] = instance;
  }

  @action onOpen(modalName: DropdownNames) {
    const otherModalName =
      modalName === 'simulateModal' ? 'primitivesModal' : 'simulateModal';

    if (modalName === 'simulateModal') {
      this.isPrimitivesDropdownPinned = false;
    } else if (modalName === 'primitivesModal') {
      this.isSimulateDropdownPinned = false;
    }

    this.dropdownInstances[otherModalName]?.actions.close();
  }

  @action togglePin(modalName: DropdownNames) {
    if (modalName === 'simulateModal') {
      this.isSimulateDropdownPinned = !this.isSimulateDropdownPinned;
    } else if (modalName === 'primitivesModal') {
      this.isPrimitivesDropdownPinned = !this.isPrimitivesDropdownPinned;
    }
  }
}

// Don't remove this declaration: this is what enables TypeScript to resolve
// this service using `Owner.lookup('service:dropdown-manager')`, as well
// as to check when you pass the service name as an argument to the decorator,
// like `@service('dropdown-manager') declare altName: DropdownManagerService;`.
declare module '@ember/service' {
  interface Registry {
    'dropdown-manager': DropdownManagerService;
  }
}
