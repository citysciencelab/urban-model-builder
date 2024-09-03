import Model, { attr, hasMany } from '@ember-data/model';
import type Edge from './edge';
import type Node from './node';

export default class ModelModel extends Model {
  @attr('string') declare name: string;

  @hasMany('nodes', { async: true, inverse: 'model' }) declare nodes:
    | Node[]
    | Promise<Node[]>;
  @hasMany('edges', { async: true, inverse: 'model' }) declare edges:
    | Edge[]
    | Promise<Edge[]>;
}
