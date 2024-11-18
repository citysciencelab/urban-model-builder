// For more information about this file see https://dove.feathersjs.com/guides/cli/application.html
import { feathers } from '@feathersjs/feathers'
import configuration from '@feathersjs/configuration'
import { koa, rest, bodyParser, errorHandler, parseAuthentication, cors, serveStatic } from '@feathersjs/koa'
import socketio from '@feathersjs/socketio'

import { configurationValidator } from './configuration.js'
import type { Application } from './declarations.js'
import { logError } from './hooks/log-error.js'
import { postgresql } from './postgresql.js'
import { authentication } from './authentication.js'
import { services } from './services/index.js'
import { channels } from './channels.js'
import { BadRequest } from '@feathersjs/errors'
import { iff } from 'feathers-hooks-common'
import { authenticate } from '@feathersjs/authentication'

const app: Application = koa(feathers())

// Load our app configuration (see config/ folder)
app.configure(configuration(configurationValidator))

// Set up Koa middleware
app.use(cors())
app.use(serveStatic(app.get('public')))
app.use(errorHandler())
app.use(parseAuthentication())
app.use(bodyParser())

// Configure services and transports
app.configure(rest())
app.configure(
  socketio({
    cors: {
      origin: app.get('origins')
    }
  })
)
app.configure(postgresql)
app.configure(authentication)
app.configure(services)
app.configure(channels)

// Register hooks that run on all service methods
app.hooks({
  around: {
    all: [logError]
  },
  before: {
    all: [iff((context) => !['authentication', 'ogcapi/processes', 'ogcapi/jobs'].includes(context.path), authenticate('oidc'))],
    create: [
      (context) => {
        delete context.data.createdAt
        delete context.data.updatedAt
      }
    ],
    patch: [
      (context) => {
        if (!context.params.isTouch) {
          delete context.data.createdAt
          delete context.data.updatedAt
        }
      }
    ],
    update: [
      () => {
        throw new BadRequest("Update is not supported. Use 'patch' instead.")
      }
    ]
  },
  after: {},
  error: {}
})
// Register application setup and teardown hooks here
app.hooks({
  setup: [],
  teardown: []
})

export { app }
