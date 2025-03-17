import { service } from '@ember/service';
import Component from '@glimmer/component';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import type ApplicationStateService from 'hcu-urban-model-builder-client/services/application-state';

export interface UiEditStateBadgeSignature {
  // The arguments accepted by the component
  Args: {
    modelVersion: ModelsVersion;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class UiEditStateBadgeComponent extends Component<UiEditStateBadgeSignature> {
  @service declare applicationState: ApplicationStateService;
}
