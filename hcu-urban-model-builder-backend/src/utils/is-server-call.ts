import { Params } from '@feathersjs/feathers'

export function isServerCall(params?: Params) {
  return !(params || {}).provider // see https://github.com/feathers-plus/feathers-hooks-common/blob/master/lib/services/is-provider.js#L10
}
