// For more information about this file see https://dove.feathersjs.com/guides/cli/service.test.html
import assert from 'assert'
import { app } from '../../../src/app.js'

describe('models-users service', () => {
  it('registered the service', () => {
    const service = app.service('models-users')

    assert.ok(service, 'Registered the service')
  })
})
