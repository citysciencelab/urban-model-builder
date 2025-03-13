import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import type UserService from 'hcu-urban-model-builder-client/services/user';

interface ModelsListIndexArgs {
  // Define the arguments passed to the component here
}

export default class ModelsListIndex extends Component<ModelsListIndexArgs> {
  @service declare user: UserService;
}
