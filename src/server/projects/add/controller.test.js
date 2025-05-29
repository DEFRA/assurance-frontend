import { addProjectController } from './controller.js'
import { createProject } from '~/src/server/services/projects.js'
import Boom from '@hapi/boom'
import { STATUS, STATUS_LABEL } from '~/src/server/constants/status.js'

jest.mock('~/src/server/services/projects.js')

describe('Add Project controller', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    mockRequest = {
      payload: {
        name: 'New Project',
        status: STATUS.GREEN,
        commentary: 'Initial setup'
      },
      logger: {
        info: jest.fn(),
        error: jest.fn()
      }
    }

    mockH = {
      view: jest.fn().mockReturnValue('view-response'),
      redirect: jest.fn().mockReturnValue('redirect-response')
    }

    jest.clearAllMocks()
  })

  describe('get', () => {
    test('should return add project form', async () => {
      // Arrange
      const expectedStatusOptions = [
        { text: 'Select status', value: '' },
        ...Object.entries(STATUS_LABEL).map(([value, text]) => ({
          value,
          text
        }))
      ]
      // Act
      const result = await addProjectController.get({}, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/add/index',
        expect.objectContaining({
          pageTitle: 'Add Project | DDTS Assurance',
          heading: 'Add Project',
          values: {},
          errors: {},
          statusOptions: expectedStatusOptions,
          statusClassMap: expect.any(Object),
          statusLabelMap: expect.any(Object)
        })
      )
      expect(result).toBe('view-response')
    })
  })

  describe('post', () => {
    test('should handle validation errors', async () => {
      // Arrange
      const invalidRequest = {
        payload: {
          name: '',
          status: 'INVALID',
          commentary: ''
        },
        logger: {
          error: jest.fn(),
          info: jest.fn()
        }
      }

      // Act
      const result = await addProjectController.post(invalidRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/add/index',
        expect.objectContaining({
          errors: expect.any(Object),
          values: invalidRequest.payload,
          errorMessage: 'Please fill in all required fields'
        })
      )
      expect(result).toBe('view-response')
    })

    test('should handle standards-related errors', async () => {
      // Arrange
      createProject.mockRejectedValue(new Error('standards not available'))

      // Act
      const result = await addProjectController.post(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/add/index',
        expect.objectContaining({
          errorMessage:
            'Unable to create project: Service standards not available',
          values: mockRequest.payload,
          heading: 'Add Project'
        })
      )
      expect(result).toBe('view-response')
    })

    test('should handle unexpected errors', async () => {
      // Arrange
      createProject.mockRejectedValue(new Error('Unexpected error'))

      // Act & Assert
      await expect(
        addProjectController.post(mockRequest, mockH)
      ).rejects.toThrow(Boom.internal('Unexpected error'))
    })
  })
})
