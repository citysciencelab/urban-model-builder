// validations/employee.js
import {
  validatePresence,
  validateFormat,
} from 'ember-changeset-validations/validators';

export default {
  selectedUser: [validatePresence(true)],
  selectedRole: [validatePresence(true)],
  model: [validatePresence(true)],
};
