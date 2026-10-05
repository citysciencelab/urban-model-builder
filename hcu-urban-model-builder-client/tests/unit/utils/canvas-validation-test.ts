import { module, test } from 'qunit';
import type { EdgeChange, NodeChange } from '@xyflow/react';
import {
  applyValidationErrors,
  changesRequireValidation,
} from 'hcu-urban-model-builder-react-canvas/lib/utils/validation.ts';

const node = (id: string, validationError?: string | null) => ({
  id,
  position: { x: 0, y: 0 },
  data: validationError === undefined ? {} : { validationError },
});

module('Unit | Utility | canvas validation', function () {
  test('select, dimensions and position changes do not trigger a check', function (assert) {
    const changes: NodeChange[] = [
      { type: 'select', id: 'a', selected: true },
      {
        type: 'dimensions',
        id: 'a',
        dimensions: { width: 200, height: 64 },
        resizing: false,
      },
      {
        type: 'position',
        id: 'a',
        position: { x: 10, y: 20 },
        dragging: false,
      },
    ];

    assert.false(changesRequireValidation(changes));
    assert.false(
      changesRequireValidation([
        { type: 'select', id: 'e', selected: false },
      ] as EdgeChange[]),
    );
    assert.false(changesRequireValidation([]));
  });

  test('add, remove and replace trigger a check', function (assert) {
    assert.true(
      changesRequireValidation([
        { type: 'add', item: node('a') },
      ] as NodeChange[]),
    );
    assert.true(
      changesRequireValidation([{ type: 'remove', id: 'a' }] as NodeChange[]),
    );
    assert.true(
      changesRequireValidation([
        { type: 'replace', id: 'a', item: node('a') },
      ] as NodeChange[]),
    );
    assert.true(
      changesRequireValidation([
        { type: 'remove', id: 'edge-1' },
      ] as EdgeChange[]),
    );
    assert.true(
      changesRequireValidation([
        { type: 'position', id: 'a', position: { x: 1, y: 1 } },
        { type: 'remove', id: 'b' },
      ] as NodeChange[]),
      'one structural change among others is enough',
    );
  });

  test('marks the node an error belongs to', function (assert) {
    const nodes = [node('a'), node('b')];

    const next = applyValidationErrors(nodes, { b: 'equation error' });

    assert.strictEqual(
      next[0],
      nodes[0],
      'an unaffected node keeps its object',
    );
    assert.strictEqual(next[1]!.data.validationError, 'equation error');
  });

  test('keeps the node list when no marker changes', function (assert) {
    const nodes = [node('a', null), node('b', 'equation error'), node('c')];

    assert.strictEqual(
      applyValidationErrors(nodes, { b: 'equation error' }),
      nodes,
    );
  });

  test('clears a fixed error and restores a marker lost by a node update', function (assert) {
    // Saving a node replaces its `data`, which drops the marker even though
    // the error itself is unchanged.
    const nodes = [node('a', 'old error'), node('b')];

    const next = applyValidationErrors(nodes, { b: 'equation error' });

    assert.strictEqual(next[0]!.data.validationError, null);
    assert.strictEqual(next[1]!.data.validationError, 'equation error');
  });
});
