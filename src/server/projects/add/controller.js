import Boom from '@hapi/boom'
import { createProject } from '~/src/server/services/projects.js'

export const addProjectController = {
  get: (request, h) => {
    return h.view('projects/add/index', {
      pageTitle: 'Add Project | DDTS Assurance',
      heading: 'Add Project',
      statusOptions: [
        {
          text: 'Select status',
          value: ''
        },
        { value: 'RED', text: 'Red' },
        { value: 'AMBER', text: 'Amber' },
        { value: 'GREEN', text: 'Green' }
      ],
      values: {},
      errors: {}
    })
  },

  post: async (request, h) => {
    const { name, status, commentary } = request.payload

    try {
      // Validate required fields
      if (!name || !status || !commentary) {
        return h.view('projects/add/index', {
          pageTitle: 'Add Project | DDTS Assurance',
          heading: 'Add Project',
          errorMessage: 'Please fill in all required fields',
          values: { name, status, commentary },
          statusOptions: [
            {
              text: 'Select status',
              value: ''
            },
            { value: 'RED', text: 'Red' },
            { value: 'AMBER', text: 'Amber' },
            { value: 'GREEN', text: 'Green' }
          ],
          errors: {}
        })
      }

      try {
        await createProject({ name, status, commentary })
        request.logger.info(`Project "${name}" created successfully`)
        return h.redirect('/?notification=Project created successfully')
      } catch (error) {
        request.logger.error({ error }, 'Failed to create project')

        // Handle validation errors
        if (error.message?.includes('Invalid data')) {
          return h.view('projects/add/index', {
            pageTitle: 'Add Project | DDTS Assurance',
            heading: 'Add Project',
            errorMessage: 'Please check your input - some fields are invalid',
            values: { name, status, commentary },
            statusOptions: [
              {
                text: 'Select status',
                value: ''
              },
              { value: 'RED', text: 'Red' },
              { value: 'AMBER', text: 'Amber' },
              { value: 'GREEN', text: 'Green' }
            ],
            errors: {}
          })
        }

        // Handle standards-related errors
        if (error.message?.includes('standards')) {
          return h.view('projects/add/index', {
            pageTitle: 'Add Project | DDTS Assurance',
            heading: 'Add Project',
            errorMessage:
              'Unable to create project: Service standards not available',
            values: { name, status, commentary },
            statusOptions: [
              {
                text: 'Select status',
                value: ''
              },
              { value: 'RED', text: 'Red' },
              { value: 'AMBER', text: 'Amber' },
              { value: 'GREEN', text: 'Green' }
            ],
            errors: {}
          })
        }

        throw error
      }
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
    }
  }
}
