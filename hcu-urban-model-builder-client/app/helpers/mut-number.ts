import {
  createInvokableRef,
  isUpdatableRef,
  type Reference,
} from '@glimmer/reference';
import { setInternalHelperManager } from '@glimmer/manager';
import { assert } from '@ember/debug';

type InvokableReference = Reference<string | number> & {
  update: (input: number | number) => void;
};

export default setInternalHelperManager(({ positional }) => {
  const ref = positional[0];
  assert('expected at least one positional arg', ref);

  assert('You can only pass a path to mut', isUpdatableRef(ref));

  const invokableRef = createInvokableRef(ref) as InvokableReference;

  const update = invokableRef.update;
  invokableRef.update = (input: string | number) => {
    if (input) {
      update(Number(input));
    }
  };

  return invokableRef;
}, {});
