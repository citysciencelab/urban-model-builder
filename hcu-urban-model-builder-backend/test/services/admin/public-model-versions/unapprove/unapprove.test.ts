// For more information about this file see https://dove.feathersjs.com/guides/cli/service.test.html
import assert from 'assert'
import { app } from '../../../../../src/app'

describe('admin/public-model-versions/unapprove service', () => {
  it('registered the service', () => {
    const service = app.service('admin/public-model-versions/unapprove')

    assert.ok(service, 'Registered the service')
  })
})
