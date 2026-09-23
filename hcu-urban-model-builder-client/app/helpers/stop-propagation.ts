import { helper } from '@ember/component/helper';

export default helper(function stopPropagation() {
  return (event: Event) => {
    event.stopPropagation();
  };
});
