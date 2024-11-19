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

const validatData = () => {
  return (
    key: string,
    newValue: number,
    oldValue: number,
    changes: any,
    content: any,
  ) => {
    if (!content.data.constraints) {
      return true;
    }
    // check if content.data.constraints.min exists and is a number
    const minIsNumber =
      content.data.constraints.min &&
      typeof content.data.constraints.min === 'number';
    const maxIsNumber =
      content.data.constraints.max &&
      typeof content.data.constraints.max === 'number';
    if (minIsNumber && maxIsNumber) {
      if (
        Number(content.data.constraints.min) >
        Number(content.data.constraints.max)
      ) {
        // TODO: i18n
        return {
          constraints: {
            min: 'Min value can not be greater than max value',
          },
        };
      }
    }
    return true;
  };
};

export default {
  name: [validatePresence(true), validateLength({ min: 2 })],
  parameterMin: [validateMinMax()],
  parameterStep: [validateStep()],
  data: [validatData()],
};