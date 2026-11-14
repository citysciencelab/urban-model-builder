import { module, test } from 'qunit';
import { NodeType } from 'hcu-urban-model-builder-backend';
import {
  roundToHundred,
  summarizeNodes,
  THUMBNAIL_HEIGHT,
  THUMBNAIL_WIDTH,
  type SummaryNode,
} from 'hcu-urban-model-builder-client/utils/model-summary';

const node = (
  id: string,
  type: NodeType,
  x = 0,
  y = 0,
  extra: Partial<SummaryNode> = {},
): SummaryNode => ({ id, type, position: { x, y }, ...extra });

module('Unit | Utility | model-summary', function () {
  test('roundToHundred keeps the sum at 100', function (assert) {
    assert.deepEqual(roundToHundred([1, 1, 1]), [34, 33, 33]);
    assert.deepEqual(roundToHundred([22, 3]), [88, 12]);
    assert.deepEqual(roundToHundred([0, 5]), [0, 100]);
    assert.deepEqual(roundToHundred([0, 0]), [0, 0]);
  });

  test('it describes the node mix by type and by paradigm', function (assert) {
    const summary = summarizeNodes([
      node('1', NodeType.Stock),
      node('2', NodeType.Stock),
      node('3', NodeType.Flow),
      node('4', NodeType.OgcApiFeatures),
    ]);

    assert.strictEqual(summary.nodeCount, 4);
    assert.deepEqual(
      summary.segments.map(({ type, share, offset }) => [type, share, offset]),
      [
        ['stock', 50, 0],
        ['flow', 25, 50],
        ['ogc-api-features', 25, 75],
      ],
    );
    assert.deepEqual(summary.paradigms, [
      { paradigm: 'sd', percent: 75 },
      { paradigm: 'geo', percent: 25 },
    ]);
  });

  test('folders count as nodes but not towards the mix, ghosts not at all', function (assert) {
    const summary = summarizeNodes([
      node('1', NodeType.State),
      node('2', NodeType.Folder),
      node('3', NodeType.Ghost),
    ]);

    assert.strictEqual(summary.nodeCount, 2);
    assert.deepEqual(summary.paradigms, [{ paradigm: 'abm', percent: 100 }]);
    assert.deepEqual(
      summary.shapes.map((shape) => shape.type),
      ['folder', 'state'],
      'group frames are drawn first',
    );
  });

  test('an empty model has no mix and no shapes', function (assert) {
    const summary = summarizeNodes([]);

    assert.strictEqual(summary.nodeCount, 0);
    assert.deepEqual(summary.segments, []);
    assert.deepEqual(summary.paradigms, []);
    assert.deepEqual(summary.shapes, []);
  });

  test('thumbnail shapes fit the sheet and keep the node forms', function (assert) {
    const { shapes } = summarizeNodes([
      node('1', NodeType.Stock, -2000, -500),
      node('2', NodeType.Variable, 3000, 900),
      node('3', NodeType.State, 0, 0),
    ]);

    for (const shape of shapes) {
      assert.true(shape.x >= 0, 'not left of the sheet');
      assert.true(shape.y >= 0, 'not above the sheet');
      assert.true(shape.x + shape.width <= THUMBNAIL_WIDTH);
      assert.true(shape.y + shape.height <= THUMBNAIL_HEIGHT);
    }

    const byType = Object.fromEntries(shapes.map((s) => [s.type, s]));
    assert.strictEqual(byType['stock']?.rx, 0, 'stock is square');
    assert.true(byType['state']!.rx > 0, 'state is rounded');
    assert.true(
      byType['variable']!.rx > byType['state']!.rx,
      'variable is a pill',
    );
  });

  test('children are placed relative to their parent', function (assert) {
    const { shapes } = summarizeNodes([
      node('agent', NodeType.Agent, 1000, 1000, { width: 400, height: 300 }),
      node('state', NodeType.State, 20, 40, { parentId: 'agent' }),
    ]);
    const agent = shapes.find((shape) => shape.type === 'agent')!;
    const state = shapes.find((shape) => shape.type === 'state')!;

    assert.true(state.x > agent.x);
    assert.true(state.y > agent.y);
    assert.true(state.x + state.width < agent.x + agent.width);
  });
});
