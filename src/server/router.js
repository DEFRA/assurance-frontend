import inert from '@hapi/inert'
import { health } from './health/index.js'
import { home } from './home/index.js'
import { about } from './about/index.js'
import { admin } from './admin/index.js'
import { authRoutes } from './auth/index.js'
import { projectsRoutes } from './projects/index.js'
import { professions } from './professions/index.js'
import { deliveryGroups } from './delivery-groups/index.js'
import { deliveryPartners } from './delivery-partners/index.js'
import { serveStaticFiles } from './common/helpers/serve-static-files.js'
/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Application specific routes, add your own routes here
      await server.register([
        home,
        about,
        admin,
        authRoutes,
        projectsRoutes,
        professions,
        deliveryGroups,
        deliveryPartners
      ])

      // Static assets
      await server.register([serveStaticFiles])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
