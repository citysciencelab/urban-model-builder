// validations/employee.js
import {
  validatePresence,
  validateLength,
} from 'ember-changeset-validations/validators';

const validateMinMax = () => {
  return (
    key: string,
    newValue: number,
    oldValue: number,
    changes: any,
    content: any,
  ) => {
    if (!content.isParameter) {
      return true;
    }

    const min = Number(newValue);
    const max = Number(content.parameterMax);
    if (min > max) {
      // TODO: i18n
      return "Min value can't be greater than max value";
    }
    return true;
  };
};

const validateStep = () => {
  return (
    key: string,
    newValue: number,
    oldValue: number,
    changes: any,
    content: any,
  ) => {
    if (!content.isParameter) {
      return true;
    }
    // min + step must not be larger than max
    const min = Number(content.parameterMin);
    const max = Number(content.parameterMax);
    const step = Number(newValue);
    if (min + step > max) {
      // TODO: i18n
      return "Min value + step can't be greater than max value";
    }
  };
};

export default {
  name: [validatePresence(true), validateLength({ min: 2 })],
  parameterMin: [validateMinMax()],
  parameterStep: [validateStep()],
};
