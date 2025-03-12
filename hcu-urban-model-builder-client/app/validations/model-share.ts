// validations/employee.js
import { validatePresence } from 'ember-changeset-validations/validators';
import type IntlService from 'ember-intl/services/intl';

export default function (intl: IntlService) {
  return {
    selectedUser: [
      validatePresence({
        presence: true,
        description: intl.t('components.share_modal.user_label'),
      }),
    ],
    selectedRole: [
      validatePresence({
        presence: true,
        description: intl.t('components.share_modal.role_label'),
      }),
    ],
    model: [
      validatePresence({
        presence: true,
        description: intl.t('models.model.singular'),
      }),
    ],
  };
}
