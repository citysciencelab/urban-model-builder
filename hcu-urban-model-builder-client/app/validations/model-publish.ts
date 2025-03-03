// validations/employee.js
import {
  validatePresence,
  validateLength,
} from 'ember-changeset-validations/validators';
import type IntlService from 'ember-intl/services/intl';

export default function (intl: IntlService) {
  return {
    notes: [
      validatePresence({
        presence: true,
        description: intl.t('models.models_version.attributes.notes'),
      }),
      validateLength({
        min: 3,
        description: intl.t('models.models_version.attributes.notes'),
      }),
    ],
  };
}
