// validations/employee.js
import {
  validatePresence,
  validateLength,
} from 'ember-changeset-validations/validators';

export default {
  notes: [validatePresence(true), validateLength({ min: 3 })],
};
