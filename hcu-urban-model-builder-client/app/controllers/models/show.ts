import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';

export default class ModelsShowController extends Controller {
  @tracked showSimulateModal = false;
}
