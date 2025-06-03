import Boom from '@hapi/boom'
import { getServiceStandards } from '~/src/server/services/service-standards.js'
import {
  getProjects,
  deleteProject,
  getProjectById,
  createProject,
  updateProject
} from '~/src/server/services/projects.js'
import { getProfessions } from '~/src/server/services/professions.js'
import { authedFetchJsonDecorator } from '~/src/server/common/helpers/fetch/authed-fetch-json.js'
import { defaultServiceStandards } from '~/src/server/data/service-standards.js'
import { defaultProjects } from '~/src/server/data/projects.js'
import { defaultProfessions } from '~/src/server/data/professions.js'
import { config } from '~/src/config/config.js'

export const adminController = {
  get: async (request, h) => {
    try {
      let standards = []
      let projects = []
      let professions = []

      // Try to get standards from API, fall back to defaults if not available
      try {
        standards = (await getServiceStandards(request)) || []
      } catch (error) {
        request.logger.warn(
          { error },
          'Could not fetch standards from API, using defaults'
        )
        standards = defaultServiceStandards
      }

      try {
        projects = (await getProjects(request)) || []
      } catch (error) {
        request.logger.error({ error }, 'Error fetching projects')
        throw Boom.boomify(error, { statusCode: 500 })
      }

      try {
        professions = (await getProfessions(request)) || []
      } catch (error) {
        request.logger.error({ error }, 'Error fetching professions')
        throw Boom.boomify(error, { statusCode: 500 })
      }

      // Get environment from config or use a default for testing
      const isTestEnvironment = config.get
        ? config.get('env') === 'test'
        : false

      const isDevelopment = config.get
        ? config.get('env') === 'development'
        : false

      return h.view('admin/index', {
        pageTitle: 'Data Management',
        heading: 'Data Management',
        standardsCount: standards?.length || 0,
        projectsCount: projects?.length || 0,
        professionsCount: professions?.length || 0,
        projects,
        notification: request.query.notification,
        isTestEnvironment,
        isDevelopment
      })
    } catch (error) {
      request.logger.error({ error }, 'Error fetching admin dashboard data')
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  deleteStandards: async (request, h) => {
    try {
      request.logger.info('Deleting all standards')

      const authedFetch = authedFetchJsonDecorator(request)
      await authedFetch('/serviceStandards/seed', {
        method: 'POST',
        body: JSON.stringify([])
      })

      request.logger.info('Standards deleted successfully')
      return h.redirect('/admin?notification=Standards deleted successfully')
    } catch (error) {
      request.logger.error({ error }, 'Failed to delete standards')
      return h.redirect('/admin?notification=Failed to delete standards')
    }
  },

  deleteProject: async (request, h) => {
    const { id } = request.params

    try {
      request.logger.info({ id }, 'Deleting project')

      const result = await deleteProject(id, request)

      if (!result) {
        request.logger.warn({ id }, 'Project not found for deletion')
        return h.redirect('/admin?notification=Project not found')
      }

      request.logger.info({ id }, 'Project deleted successfully')
      return h.redirect('/admin?notification=Project deleted successfully')
    } catch (error) {
      request.logger.error({ error }, 'Failed to delete project')
      return h.redirect('/admin?notification=Failed to delete project')
    }
  },

  confirmDeleteProject: async (request, h) => {
    const { id } = request.params

    try {
      // If this is a POST with confirmed=true, proceed with deletion
      if (request.method === 'post' && request.payload.confirmed === 'true') {
        return await adminController.deleteProject(request, h)
      }

      // Otherwise show confirmation page
      let projectName = 'this project'

      try {
        const project = await getProjectById(id, request)
        if (project) {
          projectName = project.name
        }
      } catch (error) {
        request.logger.warn(
          { error, id },
          'Failed to fetch project for confirmation page'
        )
        // Continue with generic name if project fetch fails
      }

      return h.view('admin/confirm-delete', {
        pageTitle: 'Confirm Project Deletion',
        heading: 'Delete Project',
        message: `Are you sure you want to delete the project "${projectName}"?`,
        confirmUrl: `/admin/projects/${id}/delete`,
        cancelUrl: id ? `/projects/${id}` : '/admin',
        backLink: id ? `/projects/${id}` : '/admin'
      })
    } catch (error) {
      request.logger.error({ error }, 'Failed to show delete confirmation')
      return h.redirect(
        '/admin?notification=Failed to show delete confirmation'
      )
    }
  },

  confirmDeleteAllStandards: async (request, h) => {
    try {
      // If this is a POST with confirmed=true, proceed with deletion
      if (request.method === 'post' && request.payload.confirmed === 'true') {
        return await adminController.deleteStandards(request, h)
      }

      // Otherwise show confirmation page
      return h.view('admin/confirm-delete', {
        pageTitle: 'Confirm Delete All Standards',
        heading: 'Delete All Standards',
        message:
          'Are you sure you want to delete ALL service standards? This will remove all standard definitions from the system.',
        confirmUrl: '/admin/standards/delete',
        cancelUrl: '/admin',
        backLink: '/admin'
      })
    } catch (error) {
      request.logger.error({ error }, 'Failed to show delete confirmation')
      return h.redirect(
        '/admin?notification=Failed to show delete confirmation'
      )
    }
  },

  confirmDeleteAllProfessions: async (request, h) => {
    try {
      // If this is a POST with confirmed=true, proceed with deletion
      if (request.method === 'post' && request.payload.confirmed === 'true') {
        return await adminController.deleteProfessions(request, h)
      }

      // Otherwise show confirmation page
      return h.view('admin/confirm-delete', {
        pageTitle: 'Confirm Delete All Professions',
        heading: 'Delete All Professions',
        message:
          'Are you sure you want to delete ALL professions? This will remove all profession definitions from the system.',
        confirmUrl: '/admin/professions/delete',
        cancelUrl: '/admin',
        backLink: '/admin'
      })
    } catch (error) {
      request.logger.error({ error }, 'Failed to show delete confirmation')
      return h.redirect(
        '/admin?notification=Failed to show delete confirmation'
      )
    }
  },

  deleteProfessions: async (request, h) => {
    request.logger.info('Deleting all professions')

    try {
      // Use the correct endpoint and HTTP method for the backend API
      const result = await authedFetchJsonDecorator(request)(
        '/professions/deleteAll',
        {
          method: 'POST'
        }
      )

      request.logger.info(
        { result: result || 'no response data' },
        'Delete professions result'
      )

      return h.redirect('/admin?notification=Professions deleted successfully')
    } catch (error) {
      request.logger.warn(
        {
          error: error.message
        },
        'Error deleting professions'
      )

      return h.redirect('/admin?notification=Failed to delete professions')
    }
  },

  /**
   * Seed service standards with default data (dev only)
   */
  seedStandardsDev: async (request, h) => {
    try {
      request.logger.info('Seeding service standards (dev only)')

      const authedFetch = authedFetchJsonDecorator(request)
      await authedFetch('/serviceStandards/seed', {
        method: 'POST',
        body: JSON.stringify(defaultServiceStandards)
      })

      request.logger.info('Service standards seeded successfully (dev only)')
      return h.redirect(
        '/admin?notification=Service standards seeded successfully'
      )
    } catch (error) {
      request.logger.error(error, 'Failed to seed service standards (dev only)')
      return h.redirect('/admin?notification=Failed to seed service standards')
    }
  },

  /**
   * Seed professions with default data (dev only)
   */
  seedProfessionsDev: async (request, h) => {
    try {
      // Delete existing professions first
      const authedFetch = authedFetchJsonDecorator(request)
      await authedFetch('/professions/deleteAll', {
        method: 'POST'
      })

      // Create each profession individually
      for (const profession of defaultProfessions) {
        await authedFetch('/professions', {
          method: 'POST',
          body: JSON.stringify(profession)
        })
      }

      request.logger.info('Professions seeded (dev only)')
      return h.redirect('/admin?notification=Professions seeded (dev only)')
    } catch (error) {
      request.logger.error(error, 'Failed to seed professions (dev only)')
      return h.redirect(
        '/admin?notification=Failed to seed professions (dev only)'
      )
    }
  },

  seedProjectsDev: async (request, h) => {
    try {
      request.logger.info(
        'Starting comprehensive project seeding with new assessment system'
      )

      // First ensure we have the required data
      await adminController.seedStandardsDev(request, h)
      await adminController.seedProfessionsDev(request, h)

      // Get reference data
      const [professions, serviceStandards] = await Promise.all([
        getProfessions(request),
        getServiceStandards(request)
      ])

      if (!professions?.length || !serviceStandards?.length) {
        throw new Error('Required reference data not available')
      }

      // Import the profession-standard matrix
      const { getAvailableStandards } = await import(
        '~/src/server/services/profession-standard-matrix.js'
      )

      // Define assessment commentaries for different scenarios
      const assessmentCommentaries = {
        'user-centred-design': {
          1: [
            'Strong user research practices',
            'User needs well understood',
            'Comprehensive user journey mapping'
          ],
          2: [
            'End-to-end user experience designed',
            'Cross-channel consistency achieved',
            'User problem clearly defined'
          ],
          3: [
            'Consistent experience across all touchpoints',
            'Seamless channel integration',
            'Unified user interface'
          ],
          4: [
            'Intuitive and accessible design',
            'Simple user workflows',
            'Clear information architecture'
          ],
          5: [
            'Accessibility standards exceeded',
            'Inclusive design principles applied',
            'Wide range of user needs considered'
          ]
        },
        'delivery-management': {
          8: [
            'Agile delivery practices in place',
            'Regular sprint reviews conducted',
            'Continuous improvement culture'
          ],
          9: [
            'Strong iteration cycles',
            'Frequent releases deployed',
            'User feedback incorporated quickly'
          ],
          15: [
            'Reliable service operations',
            'Robust monitoring in place',
            'Efficient incident response'
          ]
        },
        'product-management': {
          1: [
            'Clear product vision defined',
            'User needs prioritized effectively',
            'Strong product roadmap'
          ],
          7: [
            'Agile product development',
            'Regular stakeholder engagement',
            'Data-driven product decisions'
          ],
          10: [
            'Performance metrics tracked',
            'Success criteria defined',
            'Regular performance reviews'
          ]
        },
        'quality-assurance': {
          5: [
            'Comprehensive accessibility testing',
            'Inclusive design validated',
            'Assistive technology support'
          ],
          9: [
            'Security testing completed',
            'Privacy controls validated',
            'Data protection measures'
          ],
          14: [
            'Service reliability tested',
            'Performance benchmarks met',
            'Operational procedures validated'
          ]
        },
        'technical-architecture': {
          8: [
            'Scalable architecture design',
            'Microservices approach adopted',
            'Cloud-native patterns'
          ],
          11: [
            'Modern technology stack',
            'Open source technologies',
            'Standards-compliant solutions'
          ],
          12: [
            'Code published on GitHub',
            'Open source contributions',
            'Reusable components created'
          ],
          13: [
            'GDS patterns implemented',
            'Common components utilized',
            'Design system compliance'
          ],
          14: [
            'High availability architecture',
            'Robust monitoring',
            'Disaster recovery planning'
          ]
        },
        architecture: {
          8: [
            'Enterprise architecture aligned',
            'Integration patterns defined',
            'API-first approach'
          ],
          11: [
            'Technology strategy aligned',
            'Architecture decisions documented',
            'Standards compliance'
          ],
          12: [
            'Open architecture principles',
            'Reusable service components',
            'API documentation'
          ],
          13: [
            'Standard patterns adopted',
            'Common components leveraged',
            'Architecture governance'
          ],
          14: [
            'Resilient system design',
            'Performance optimization',
            'Scalability planning'
          ]
        },
        'software-development': {
          8: [
            'Continuous integration setup',
            'Automated testing pipeline',
            'Code quality standards'
          ],
          11: [
            'Modern development practices',
            'Version control workflows',
            'Code review processes'
          ],
          12: [
            'Open source development',
            'Public repositories maintained',
            'Community contributions'
          ],
          13: [
            'Standard libraries used',
            'Reusable code components',
            'Best practice adherence'
          ],
          14: [
            'Production monitoring',
            'Error tracking systems',
            'Performance optimization'
          ]
        },
        'business-analysis': {
          7: [
            'Requirements well documented',
            'Stakeholder needs analyzed',
            'Business case validated'
          ],
          11: [
            'Technology requirements defined',
            'System integration needs',
            'Data requirements analysis'
          ]
        },
        'release-management': {
          7: [
            'Release process documented',
            'Deployment pipeline automated',
            'Release planning effective'
          ],
          14: [
            'Reliable deployment process',
            'Rollback procedures tested',
            'Production support ready'
          ]
        }
      }

      const statuses = [
        'RED',
        'AMBER_RED',
        'AMBER',
        'GREEN_AMBER',
        'GREEN',
        'TBC'
      ]

      // Helper function to get random commentary
      const getRandomCommentary = (professionId, standardNumber) => {
        const professionCommentaries = assessmentCommentaries[professionId]
        if (professionCommentaries?.[standardNumber]) {
          const options = professionCommentaries[professionId][standardNumber]
          return options[Math.floor(Math.random() * options.length)]
        }
        return `Assessment for standard ${standardNumber} by ${professionId}`
      }

      // Create projects with proper assessment data
      for (const projectData of defaultProjects) {
        try {
          request.logger.info(`Creating project: ${projectData.name}`)

          // Create the project (without old profession/standards arrays)
          const createdProject = await createProject(
            {
              ...projectData,
              professions: undefined, // Remove old professions array
              standards: undefined // Remove old standards array
            },
            request
          )

          if (!createdProject?.id) {
            throw new Error(`Failed to create project: ${projectData.name}`)
          }

          request.logger.info(
            `Created project ${projectData.name} with ID: ${createdProject.id}`
          )

          // Get valid profession-standard combinations for this project's phase
          const validCombinations = []

          for (const profession of professions) {
            const availableStandards = getAvailableStandards(
              projectData.phase,
              profession.id
            )

            for (const standardNumber of availableStandards) {
              // Find the standard by number
              const standard = serviceStandards.find(
                (s) => s.number === standardNumber
              )
              if (standard) {
                validCombinations.push({
                  professionId: profession.id,
                  professionName: profession.name,
                  standardId: standard.id,
                  standardNumber: standard.number
                })
              }
            }
          }

          request.logger.info(
            `Found ${validCombinations.length} valid assessment combinations for ${projectData.name} (${projectData.phase})`
          )

          // Create assessments for a subset of valid combinations
          const numberOfAssessments = Math.min(
            validCombinations.length,
            Math.floor(Math.random() * 8) + 5
          ) // 5-12 assessments
          const selectedCombinations = validCombinations
            .sort(() => 0.5 - Math.random())
            .slice(0, numberOfAssessments)

          // Create individual assessments using the new API
          const authedFetch = authedFetchJsonDecorator(request)

          for (const combination of selectedCombinations) {
            const status = statuses[Math.floor(Math.random() * statuses.length)]
            const commentary = getRandomCommentary(
              combination.professionId,
              combination.standardNumber
            )

            try {
              await authedFetch(
                `/projects/${createdProject.id}/standards/${combination.standardId}/professions/${combination.professionId}/assessment`,
                {
                  method: 'POST',
                  body: JSON.stringify({
                    status,
                    commentary
                  })
                }
              )

              request.logger.info(
                `Created assessment: ${combination.professionName} -> Standard ${combination.standardNumber} (${status})`
              )
            } catch (assessmentError) {
              request.logger.warn(
                `Failed to create assessment for ${combination.professionName} -> Standard ${combination.standardNumber}: ${assessmentError.message}`
              )
            }
          }

          // Generate historical assessments
          const now = new Date()
          const daysAgo = 90 // 3 months of history

          for (let i = daysAgo; i >= 10; i -= 15) {
            // Every 15 days
            const historicDate = new Date(now)
            historicDate.setDate(historicDate.getDate() - i)

            // Update some assessments historically
            const assessmentsToUpdate = selectedCombinations
              .sort(() => 0.5 - Math.random())
              .slice(0, Math.floor(Math.random() * 3) + 1) // 1-3 updates per period

            for (const combination of assessmentsToUpdate) {
              const status =
                statuses[Math.floor(Math.random() * statuses.length)]
              const commentary = `Historic update: ${getRandomCommentary(combination.professionId, combination.standardNumber)} (${historicDate.toDateString()})`

              try {
                await authedFetch(
                  `/projects/${createdProject.id}/standards/${combination.standardId}/professions/${combination.professionId}/assessment`,
                  {
                    method: 'POST',
                    body: JSON.stringify({
                      status,
                      commentary
                    })
                  }
                )
              } catch (error) {
                request.logger.warn(
                  `Failed to create historic assessment: ${error.message}`
                )
              }
            }

            // Also create some project-level delivery updates
            if (Math.random() > 0.5) {
              // 50% chance of delivery update
              const deliveryStatus =
                statuses[Math.floor(Math.random() * statuses.length)]
              const deliveryCommentary = `Delivery update from ${historicDate.toDateString()}: ${projectData.commentary}`

              try {
                await updateProject(
                  createdProject.id,
                  {
                    status: deliveryStatus,
                    commentary: deliveryCommentary,
                    updateDate: historicDate.toISOString().split('T')[0]
                  },
                  request
                )
              } catch (error) {
                request.logger.warn(
                  `Failed to create historic delivery update: ${error.message}`
                )
              }
            }
          }
        } catch (error) {
          request.logger.error(
            `Failed to seed project ${projectData.name}: ${error.message}`
          )
          continue // Continue with next project
        }
      }

      request.logger.info(
        'Projects seeded successfully with new assessment system'
      )
      return h.redirect(
        '/admin?notification=Projects and assessments seeded successfully with new system'
      )
    } catch (error) {
      request.logger.error(`Failed to seed projects: ${error.message}`)
      return h.redirect(
        '/admin?notification=Failed to seed projects and assessments'
      )
    }
  }
}
