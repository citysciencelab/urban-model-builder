import Component from '@glimmer/component';
import { action } from '@ember/object';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import { Changeset, EmberChangeset } from 'ember-changeset';
import lookupValidator from 'ember-changeset-validations';
import { tracked } from '@glimmer/tracking';
import ModelShareValidations from '../../validations/model-share';
import type { FormModelShare } from 'global';
import { inject as service } from '@ember/service';
import type Store from '@ember-data/store';
import UserModel from 'hcu-urban-model-builder-client/models/user';
import type IntlService from 'ember-intl/services/intl';
import type ModelsUser from 'hcu-urban-model-builder-client/models/models-user';
import { Roles } from 'hcu-urban-model-builder-backend';

export interface ModelShareModalSignature {
  // The arguments accepted by the component
  Args: {
    model: ModelsVersion;
    onClose: () => void;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class ModelShareModalComponent extends Component<ModelShareModalSignature> {
  @service declare store: Store;
  @service declare intl: IntlService;
  @tracked changeset!: EmberChangeset;
  @tracked formModel!: FormModelShare;

  @tracked selectedUser: UserModel | null = null;
  @tracked currentPermissions: ModelsUser[] = [];

  roles = [
    {
      label: 'None',
      value: Roles.none,
    },
    {
      label: 'Viewer',
      value: Roles.viewer,
    },
    {
      label: 'Collaborator',
      value: Roles.collaborator,
    },
    {
      label: 'Co-Owner',
      value: Roles.co_owner,
    },
    {
      label: 'Owner',
      value: Roles.owner,
    },
  ];

  async initChangeset() {
    this.formModel = {
      selectedUser: null,
      selectedRole: null,
      model: await this.args.model.model,
    };

    this.changeset = Changeset(
      this.formModel,
      lookupValidator(ModelShareValidations),
      ModelShareValidations,
    );
  }

  async loadPermissions() {
    const model = await this.args.model.model;
    const permissions = await model?.permissions;
    if (permissions) {
      this.currentPermissions = permissions;
    }
  }

  @action async prepare() {
    for (let i = 0; i < this.roles.length; i++) {
      if (this.roles[i]) {
        this.roles[i].label = this.intl.t(`permissions.${i}`);
      }
    }

    this.loadPermissions();

    await this.initChangeset();
  }

  @action async lookupUsers(term: string): Promise<UserModel[]> {
    const users = (await this.store.query('user', {
      email: {
        $ilike: `%${term}%`,
      },
    })) as UserModel[];

    const ninIds = this.currentPermissions.map(
      (permission) => permission.user.id,
    ) as string[];
    return users.filter(
      (user: UserModel) => !ninIds.includes(user.id as string),
    );
  }

  @action onUserChange(user: UserModel) {
    this.changeset.set('selectedUser', user);
  }

  @action onHide() {
    this.args.onClose();
    return false;
  }

  @action async onSubmit() {
    const isValid = await this.changeset.validate();

    if (isValid) {
      this.changeset.execute();

      const record = this.store.createRecord('models-user', {
        model: this.formModel.model,
        user: this.formModel.selectedUser,
        role: this.formModel.selectedRole?.value,
      }) as ModelsUser;

      await record.save();

      await this.loadPermissions();

      this.initChangeset();
    } else {
      console.error('Error Message');
    }
  }

  @action async removePermission(permission: ModelsUser) {
    await permission.destroyRecord();
  }
}
