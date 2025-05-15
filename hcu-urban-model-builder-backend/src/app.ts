// For more information about this file see https://dove.feathersjs.com/guides/cli/application.html
import { feathers } from '@feathersjs/feathers'
import configuration from '@feathersjs/configuration'
import { koa, rest, bodyParser, errorHandler, parseAuthentication, cors, serveStatic } from '@feathersjs/koa'
import socketio from '@feathersjs/socketio'

import { configurationValidator } from './configuration.js'
import { STASH_BEFORE_KEY, type Application } from './declarations.js'
import { logError } from './hooks/log-error.js'
import { postgresql } from './postgresql.js'
import { authentication } from './authentication.js'
import { services } from './services/index.js'
import { channels } from './channels.js'
import { BadRequest } from '@feathersjs/errors'
import { iff, stashBefore } from 'feathers-hooks-common'
import { authenticate } from '@feathersjs/authentication'
import { errorHandler as errorHandlerHook } from './hooks/error-handler.js'
import { adminTokenAuthenticate } from './hooks/admin-token-authenticate.js'

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
    all: [errorHandlerHook, logError]
  },
  before: {
    all: [
      iff(
        (context) =>
          ![
            'authentication',
            'ogcapi/processes',
            'ogcapi/jobs',
            'ogcapi/processes/:processId/execution',
            'ogcapi/jobs/:jobId/results'
          ].includes(context.path) && !context.path.startsWith('admin/'),
        authenticate('oidc')
      ),
      iff((context) => context.path.startsWith('admin/'), adminTokenAuthenticate)
    ],
    create: [
      (context) => {
        delete context.data?.createdAt
        delete context.data?.updatedAt
      }
    ],
    patch: [
      (context) => {
        if (!context.params.isTouch) {
          delete context.data.createdAt
          delete context.data.updatedAt
        }
      },
      iff(
        (context) =>
          context.path !== 'admin/public-model-versions/approve' &&
          context.path !== 'admin/public-model-versions/unapprove',
        stashBefore(STASH_BEFORE_KEY)
      )
    ],
    update: [
      () => {
        throw new BadRequest("Update is not supported. Use 'patch' instead.")
      }
    ],
    remove: [stashBefore(STASH_BEFORE_KEY)]
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
