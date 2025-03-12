import {
  validatePresence,
  validateNumber,
  validateInclusion,
} from 'ember-changeset-validations/validators';
import type IntlService from 'ember-intl/services/intl';

export default function (intl: IntlService) {
  return {
    timeUnits: [
      validatePresence({
        presence: true,
        description: intl.t('models.models_version.attributes.timeUnits'),
      }),
      validateInclusion({
        list: [
          'Seconds',
          'Minutes',
          'Hours',
          'Days',
          'Weeks',
          'Months',
          'Years',
        ],
        description: intl.t('models.models_version.attributes.timeUnits'),
      }),
    ],
    timeStart: [
      validateNumber({
        integer: true,
        allowBlank: false,
        positive: true,
        description: intl.t('models.models_version.attributes.timeStart'),
      }),
    ],
    timeLength: [
      validateNumber({
        integer: true,
        allowBlank: false,
        positive: true,
        description: intl.t('models.models_version.attributes.timeLength'),
      }),
    ],
    timeStep: [
      validateNumber({
        integer: false,
        allowBlank: false,
        positive: true,
        description: intl.t('models.models_version.attributes.timeStep'),
      }),
    ],
    algorithm: [
      validatePresence({
        presence: true,
        description: intl.t('models.models_version.attributes.algorithm'),
      }),
      validateInclusion({
        list: ['Euler', 'RK4'],
        description: intl.t('models.models_version.attributes.algorithm'),
      }),
    ],
  };
}
