import Controller from '@ember/controller';
import { service } from '@ember/service';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import type ModelDialogsService from 'hcu-urban-model-builder-client/services/model-dialogs';

export default class ModelsVersionsShowController extends Controller<ModelsVersion> {
  @service declare modelDialogs: ModelDialogsService;
}
