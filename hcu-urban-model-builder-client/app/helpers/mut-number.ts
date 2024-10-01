import {
  createInvokableRef,
  isUpdatableRef,
  type Reference,
} from '@glimmer/reference';
import { setInternalHelperManager } from '@glimmer/manager';
import { assert } from '@ember/debug';

type InvokableReference = Reference<number> & {
  update: (input: number) => void;
};

export default setInternalHelperManager(({ positional }) => {
  const ref = positional[0];
  assert('expected at least one positional arg', ref);

  assert('You can only pass a path to mut', isUpdatableRef(ref));

  const invokableRef = createInvokableRef(ref) as InvokableReference;

  const update = invokableRef.update;
  invokableRef.update = (input: number) => {
    update(Number(input));
  };

  return invokableRef;
}, {});
