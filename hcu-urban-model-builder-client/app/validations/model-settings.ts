// validations/model-settings.ts
import {
  validatePresence,
  validateNumber,
  validateInclusion,
} from 'ember-changeset-validations/validators';

export default {
  timeUnits: [
    validatePresence(true),
    validateInclusion({
      list: ['Seconds', 'Minutes', 'Hours', 'Days', 'Weeks', 'Months', 'Years'],
    }),
  ],
  timeStart: [
    validateNumber({ integer: true, allowBlank: false, positive: true }),
  ],
  timeLength: [
    validateNumber({ integer: true, allowBlank: false, positive: true }),
  ],
  timeStep: [
    validateNumber({ integer: false, allowBlank: false, positive: true }),
  ],
  algorithm: [
    validatePresence(true),
    validateInclusion({ list: ['Euler', 'RK4'] }),
  ],
};
