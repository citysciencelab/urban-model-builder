import { helper } from '@ember/component/helper';

// this helper uses the modulo operator to check if a value is in range
// caution: could be so simple, but float math is unprecise
//          this is why we multiply the values by 1000, use toPrecision(4)
//          and compare the result afterwards
const multiplier = 1000;
const precision = 4;

export default helper(function checkStepInRange([min, step, value]: [
  number,
  number,
  number,
]) {
  const baseValue = Number(
    parseFloat(`${(value - min) * multiplier}`).toPrecision(precision),
  );
  const stepValue = Number(
    parseFloat(`${step * multiplier}`).toPrecision(precision),
  );

  const calc = baseValue % stepValue;

  return calc == 0;
});
