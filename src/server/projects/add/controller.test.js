import { addProjectController } from './controller.js'
import { createProject } from '~/src/server/services/projects.js'
import Boom from '@hapi/boom'

jest.mock('~/src/server/services/projects.js')

describe('Add Project controller', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    mockRequest = {
      payload: {
        name: 'New Project',
        phase: 'Discovery',
        defCode: 'TEST001',
        status: 'GREEN',
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
        { value: 'RED', text: 'Red' },
        { value: 'AMBER_RED', text: 'Amber/Red' },
        { value: 'AMBER', text: 'Amber' },
        { value: 'GREEN_AMBER', text: 'Green/Amber' },
        { value: 'GREEN', text: 'Green' }
      ]

      const expectedPhaseOptions = [
        { text: 'Select phase', value: '' },
        { value: 'Discovery', text: 'Discovery' },
        { value: 'Alpha', text: 'Alpha' },
        { value: 'Private Beta', text: 'Private Beta' },
        { value: 'Public Beta', text: 'Public Beta' },
        { value: 'Live', text: 'Live' }
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
          phaseOptions: expectedPhaseOptions
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
          phase: '',
          status: '',
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
          errors: expect.objectContaining({
            name: true,
            phase: true,
            status: true,
            commentary: true
          }),
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
      ).rejects.toThrow(
        Boom.boomify(new Error('Unexpected error'), { statusCode: 500 })
      )
    })

    test('should create project successfully', async () => {
      // Arrange
      createProject.mockResolvedValue({ id: '123' })

      // Act
      const result = await addProjectController.post(mockRequest, mockH)

      // Assert
      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Project',
          phase: 'Discovery',
          defCode: 'TEST001',
          status: 'GREEN',
          commentary: 'Initial setup'
        }),
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/?notification=Project created successfully'
      )
      expect(result).toBe('redirect-response')
    })
  })
})
