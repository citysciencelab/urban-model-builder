// For more information about this file see https://dove.feathersjs.com/guides/cli/client.test.html
import assert from 'assert'
import axios from 'axios'
import { app } from '../src/app.js'
import { createClient } from '../src/client.js'
import type { UserData } from '../src/client.js'
import restModule from '@feathersjs/rest-client'
const rest = restModule as unknown as any
import authenticationClient from '@feathersjs/authentication-client'

const port = app.get('port')
const appUrl = `http://${app.get('host')}:${port}`

describe('application client tests', () => {
  const client = createClient(rest(appUrl).axios(axios))

  before(async () => {
    await app.listen(port)
  })

  after(async () => {
    await app.teardown()
  })

  it('initialized the client', () => {
    assert.ok(client)
  })
})
