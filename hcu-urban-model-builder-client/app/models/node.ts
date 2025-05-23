import Model, {
  attr,
  belongsTo,
  hasMany,
  type AsyncBelongsTo,
  type AsyncHasMany,
} from '@ember-data/model';
import { Type } from '@warp-drive/core-types/symbols';
import type Edge from './edge';
import { NodeType, type Nodes } from 'hcu-urban-model-builder-backend';
import type ModelsVersion from './models-version';
import { dasherize } from '@ember/string';
import type ScenariosValue from './scenarios-value';

export default class Node extends Model {
  [Type] = 'node' as const;

  @attr('number') declare type: NodeType;

  @attr('string') declare name: string;
  @attr('string') declare description: string;

  @attr() declare data: Nodes['data'];

  @attr() declare position: { x: number; y: number };

  @attr('number') declare height: number;

  @attr('number') declare width: number;

  @attr('boolean') declare isParameter: boolean;
  @attr('string') declare parameterType: string | null;
  @attr() declare parameterOptions: any;
  @attr('number') declare parameterMin: number;
  @attr('number') declare parameterMax: number;
  @attr('number') declare parameterStep: number;
  @attr('boolean') declare isOutputParameter: boolean;

  @belongsTo('modelsVersion', { async: true, inverse: 'nodes' })
  declare modelsVersions: ModelsVersion;

  @hasMany('edge', { async: true, inverse: 'source' })
  declare sourceEdges: AsyncHasMany<Edge>;

  @hasMany('edge', { async: true, inverse: 'target' })
  declare targetEdges: AsyncHasMany<Edge>;

  @belongsTo('node', { async: true, inverse: null })
  declare parent: AsyncBelongsTo<Node>;

  @belongsTo('node', { async: true, inverse: 'ghostChildren' })
  declare ghostParent: AsyncBelongsTo<Node>;

  @hasMany('node', { async: true, inverse: 'ghostParent' })
  declare ghostChildren: AsyncHasMany<Node>;

  @hasMany('scenarios-value', { async: true, inverse: 'nodes' })
  declare scenariosValues: ScenariosValue[];

  @attr('date') declare createdAt: Date;
  @attr('date') declare updatedAt: Date;

  get raw() {
    return {
      id: this.id,
      type: dasherize(NodeType[this.type]),
      position: this.position,
      parentId: this.parent?.id,
      height: this.height,
      width: this.width,
      data: { emberModel: this as Node },
    };
  }

  get isGhost() {
    return this.type === NodeType.Ghost;
  }

  /**
   * Get all source edges, including those that are connected through ghost nodes.
   */
  get sourceEdgesWithGhosts() {
    const fetch = async () => {
      const edges = await this.sourceEdges;
      const childrenEdges = await Promise.all(
        (await this.ghostChildren).map((child) => child.sourceEdges),
      );
      return edges.concat(...childrenEdges);
    };
    return fetch();
  }

  /**
   * Get all target edges, including those that are connected through ghost nodes.
   */
  get targetEdgesWithGhosts() {
    const fetch = async () => {
      const edges = await this.targetEdges;
      const childrenEdges = await Promise.all(
        (await this.ghostChildren).map((child) => child.targetEdges),
      );
      return edges.concat(...childrenEdges);
    };
    return fetch();
  }
}
