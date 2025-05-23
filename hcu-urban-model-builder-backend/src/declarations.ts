// For more information about this file see https://dove.feathersjs.com/guides/cli/typescript.html
import { HookContext as FeathersHookContext, NextFunction, ServiceMethods } from '@feathersjs/feathers'
import { Application as FeathersApplication } from '@feathersjs/koa'
import { ApplicationConfiguration } from './configuration.js'

import { User } from './services/users/users.js'
import { JobQueueAdapter } from './utils/job-queue-adapter/base.js'
import { ServiceSwaggerOptions } from 'feathers-swagger'

export type { NextFunction }

// The types for app.get(name) and app.set(name)
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Configuration extends ApplicationConfiguration {
  jobQueue: any
}

// A mapping of service names to types. Will be extended in service files.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServiceTypes {}

// The application instance type that will be used everywhere else
export type Application = FeathersApplication<ServiceTypes, Configuration>

// The context for hook functions - can be typed with a service class
export type HookContext<S = any> = FeathersHookContext<Application, S> & {
  params?: {
    disableSoftDelete?: boolean
    isDeleteRelated?: boolean
    isFinalDelete?: boolean
  }
}

// Add the user as an optional property to all params
declare module '@feathersjs/feathers' {
  interface Params {
    user?: User
    isTouch?: Boolean
  }
}

export const STASH_BEFORE_KEY = 'stashBefore'

export type ServiceNamesWithGet = {
  [K in keyof ServiceTypes]: ServiceTypes[K] extends Pick<ServiceMethods<any>, 'get'> ? K : never
}[keyof ServiceTypes]

declare module '@feathersjs/feathers' {
  interface ServiceOptions {
    docs?: ServiceSwaggerOptions
  }
}
