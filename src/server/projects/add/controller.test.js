import { addProjectController } from './controller.js'

const mockCreateProject = jest.fn()

jest.mock('~/src/server/services/projects.js', () => ({
  createProject: (...args) => mockCreateProject(...args)
}))

describe('Add Project controller', () => {
  const mockH = {
    view: jest.fn(),
    redirect: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('get', () => {
    test('should return add project form', async () => {
      // Act
      await addProjectController.get({}, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('projects/add/index', {
        pageTitle: 'Add Project | DDTS Assurance',
        heading: 'Add Project',
        values: {},
        errors: {},
        statusOptions: [
          {
            text: 'Select status',
            value: ''
          },
          { value: 'RED', text: 'Red' },
          { value: 'AMBER', text: 'Amber' },
          { value: 'GREEN', text: 'Green' }
        ]
      })
    })
  })

  describe('post', () => {
    test('should create project and redirect on success', async () => {
      // Arrange
      const mockRequest = {
        payload: {
          name: 'New Project',
          status: 'GREEN',
          commentary: 'Initial setup'
        },
        logger: {
          error: jest.fn(),
          info: jest.fn()
        }
      }
      mockCreateProject.mockResolvedValue({ id: '1' })

      // Act
      await addProjectController.post(mockRequest, mockH)

      // Assert
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: 'New Project',
        status: 'GREEN',
        commentary: 'Initial setup'
      })
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/?notification=Project created successfully'
      )
    })

    test('should handle validation errors', async () => {
      // Arrange
      const mockRequest = {
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
      await addProjectController.post(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/add/index',
        expect.objectContaining({
          errors: expect.any(Object),
          values: mockRequest.payload
        })
      )
    })

    test('should handle creation errors', async () => {
      // Arrange
      const mockRequest = {
        payload: {
          name: 'New Project',
          status: 'GREEN',
          commentary: 'Initial setup'
        },
        logger: {
          error: jest.fn(),
          info: jest.fn()
        }
      }
      mockCreateProject.mockRejectedValue(new Error('Invalid data'))

      // Act
      await addProjectController.post(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/add/index',
        expect.objectContaining({
          errorMessage: 'Please check your input - some fields are invalid',
          values: mockRequest.payload,
          heading: 'Add Project',
          statusOptions: [
            {
              text: 'Select status',
              value: ''
            },
            { value: 'RED', text: 'Red' },
            { value: 'AMBER', text: 'Amber' },
            { value: 'GREEN', text: 'Green' }
          ]
        })
      )
    })

    test('should handle standards-related errors', async () => {
      // Arrange
      const mockRequest = {
        payload: {
          name: 'New Project',
          status: 'GREEN',
          commentary: 'Initial setup'
        },
        logger: {
          error: jest.fn(),
          info: jest.fn()
        }
      }
      mockCreateProject.mockRejectedValue(new Error('standards not available'))

      // Act
      await addProjectController.post(mockRequest, mockH)

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
    })

    test('should handle unexpected errors', async () => {
      // Arrange
      const mockRequest = {
        payload: {
          name: 'New Project',
          status: 'GREEN',
          commentary: 'Initial setup'
        },
        logger: {
          error: jest.fn(),
          info: jest.fn()
        }
      }
      mockCreateProject.mockRejectedValue(new Error('Unexpected error'))

      // Act & Assert
      await expect(
        addProjectController.post(mockRequest, mockH)
      ).rejects.toThrow('Unexpected error')
    })
  })
})
