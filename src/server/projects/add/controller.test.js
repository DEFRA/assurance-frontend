import { addProjectController } from './controller.js'
import { createProject } from '~/src/server/services/projects.js'

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
        { value: 'GREEN', text: 'Green' },
        { value: 'TBC', text: 'TBC' }
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
        'projects/add/views/index',
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
        'projects/add/views/index',
        expect.objectContaining({
          errorMessage: 'Please check your input - some fields are required',
          errors: expect.objectContaining({
            name: { text: 'Enter a project name' },
            phase: { text: 'Select a project phase' }
          }),
          values: { name: '', phase: '', status: '', commentary: '' }
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
        'projects/add/views/index',
        expect.objectContaining({
          errorMessage: 'Failed to create project',
          heading: 'Add Project',
          values: mockRequest.payload
        })
      )
      expect(result).toBe('view-response')
    })

    test('should handle unexpected errors', async () => {
      // Arrange
      createProject.mockRejectedValue(new Error('Unexpected error'))

      // Act & Assert
      await addProjectController.post(mockRequest, mockH)

      // Should return a view with error message instead of throwing
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/add/views/index',
        expect.objectContaining({
          errorMessage: 'Failed to create project',
          values: mockRequest.payload
        })
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
          status: 'TBC',
          commentary: ''
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
