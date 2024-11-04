import { helper } from '@ember/component/helper';

export default helper(function isNumeric(positional /*, named*/) {
  const [value] = positional;
  if (typeof value !== 'undefined' && value == null) {
    return false;
  }
  return !isNaN(value as unknown as any);
});
