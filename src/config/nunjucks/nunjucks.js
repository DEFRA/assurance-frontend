import { fileURLToPath } from 'node:url'
import path from 'path'
import nunjucks from 'nunjucks'
import hapiVision from '@hapi/vision'

import { config } from '~/src/config/config.js'
import { context } from './context/context.js'
import * as filters from './filters/filters.js'
import * as globals from './globals.js'
import { formatDate } from './filters/format-date.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export function configureNunjucks() {
  const nunjucksEnvironment = nunjucks.configure(
    [
      'node_modules/govuk-frontend/dist/',
      path.resolve(dirname, '../../server/common/templates'),
      path.resolve(dirname, '../../server/common/components'),
      path.resolve(dirname, '../../server/common/macros') // <-- added macros directory
    ],
    {
      autoescape: true,
      throwOnUndefined: false,
      trimBlocks: true,
      lstripBlocks: true,
      watch: config.get('nunjucks.watch'),
      noCache: config.get('nunjucks.noCache')
    }
  )

  Object.entries(globals).forEach(([name, global]) => {
    nunjucksEnvironment.addGlobal(name, global)
  })

  Object.entries(filters).forEach(([name, filter]) => {
    nunjucksEnvironment.addFilter(name, filter)
  })

  // Add formatDate filter
  nunjucksEnvironment.addFilter('formatDate', formatDate)

  return nunjucksEnvironment
}

const nunjucksEnvironment = configureNunjucks()

/**
 * @satisfies {ServerRegisterPluginObject<ServerViewsConfiguration>}
 */
export const nunjucksConfig = {
  plugin: hapiVision,
  options: {
    engines: {
      njk: {
        compile(src, options) {
          const template = nunjucks.compile(src, options.environment)
          return (ctx) => template.render(ctx)
        }
      }
    },
    compileOptions: {
      environment: nunjucksEnvironment
    },
    relativeTo: path.resolve(dirname, '../..'),
    path: 'server',
    isCached: config.get('isProduction'),
    context
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 * @import { ServerViewsConfiguration } from '@hapi/vision'
 */
