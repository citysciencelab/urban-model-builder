// validations/employee.js
import {
  validatePresence,
  validateLength,
} from 'ember-changeset-validations/validators';
import type IntlService from 'ember-intl/services/intl';

export default function (intl: IntlService) {
  return {
    internalName: [
      validatePresence({
        presence: true,
        description: intl.t('models.model.attributes.name'),
      }),
      validateLength({
        min: 3,
        max: 255,
        description: intl.t('models.model.attributes.name'),
      }),
    ],
  };
}
