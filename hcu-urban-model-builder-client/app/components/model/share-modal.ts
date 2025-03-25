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
import type UserService from 'hcu-urban-model-builder-client/services/user';
import type ModelModel from 'hcu-urban-model-builder-client/models/model';
import type RouterService from '@ember/routing/router-service';

export interface ModelShareModalSignature {
  // The arguments accepted by the component
  Args: {
    model: ModelModel;
    modelVersion: ModelsVersion;
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
  @service declare user: UserService;
  @service declare router: RouterService;

  @tracked changeset!: EmberChangeset;
  @tracked formModel!: FormModelShare;

  @tracked currentPermissions: ModelsUser[] = [];

  @tracked
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
  ];

  get Validation() {
    return ModelShareValidations(this.intl);
  }

  async initChangeset() {
    this.formModel = {
      userMail: '',
      selectedRole: null,
      model: await this.args.model,
    };

    this.changeset = Changeset(
      this.formModel,
      lookupValidator(this.Validation),
      this.Validation,
    );
  }

  async loadPermissions() {
    const model = await this.args.model;
    const permissions = await model?.permissions;
    if (permissions) {
      this.currentPermissions = permissions;
    }
  }

  @action canBeChanged(permission: ModelsUser) {
    // ---
    // Scenario: Owner can never be deleted
    if (permission.role == Roles.owner) {
      return false;
    }

    // ---
    // Scenario: Co-Owner
    // co-owner cant delete other co-owners or owners
    if (
      this.args.model.get('role') == Roles.co_owner && // I'm a co-owner
      permission.role >= Roles.co_owner // I'm trying to delete a co-owner or owner
    ) {
      // I can only remove myself
      return permission.user.id == this.user.currentUserId;
      // return this.user.currentUserId != permission.user.id;
    }

    // default: is allowed
    return true;
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
        userEmail: this.formModel.userMail,
        role: this.formModel.selectedRole?.value,
      }) as ModelsUser;

      try {
        await record.save();
      } catch (error) {
        // re-initialize changeset with error
        this.changeset = Changeset(
          this.formModel,
          lookupValidator(this.Validation),
          this.Validation,
        );
        // set error on changeset
        this.changeset.addError(
          'userMail',
          this.intl.t('components.share_modal.user_not_found_error'),
        );

        return false;
      }

      await this.loadPermissions();

      this.initChangeset();
    } else {
      console.error('Error Message');
    }
  }

  @action async removePermission(permission: ModelsUser) {
    let shouldBeRemoved = true;

    let userRemovedOwnPermissions = false;
    if (permission.user.id == this.user.currentUserId) {
      shouldBeRemoved = confirm(
        this.intl.t('actions.confirm_remove_own_permissions'),
      );
      userRemovedOwnPermissions = true;
    }
    if (shouldBeRemoved) {
      await permission.destroyRecord();
      if (userRemovedOwnPermissions) {
        // user removed themselves -> redirect start page
        return this.router.transitionTo('models');
      }
    }
  }

  @action async updatePermission(
    permission: ModelsUser,
    newRole: number,
    dd: { actions: { close: () => void } },
  ) {
    let shouldBeUpdated = true;
    let userChangedOwnPermissions = false;
    if (permission.user.id == this.user.currentUserId) {
      shouldBeUpdated = confirm(
        this.intl.t('actions.confirm_change_own_permissions'),
      );
      userChangedOwnPermissions = true;
    }
    if (shouldBeUpdated) {
      permission.role = newRole;
      await permission.save();
      if (userChangedOwnPermissions && permission.role < Roles.co_owner) {
        // user changed their role to viewer or collaborator -> reload page
        location.reload();
      }
    }
    dd.actions.close();
  }
}
