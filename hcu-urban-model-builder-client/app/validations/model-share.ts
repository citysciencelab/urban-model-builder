// validations/employee.js
import {
  validatePresence,
  validateFormat,
} from 'ember-changeset-validations/validators';
import type IntlService from 'ember-intl/services/intl';

export default function (intl: IntlService) {
  return {
    userMail: [
      validatePresence({
        presence: true,
        description: intl.t('components.share_modal.user_mail_label'),
      }),
      validateFormat({
        type: 'email',
        description: intl.t('components.share_modal.user_mail_label'),
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
