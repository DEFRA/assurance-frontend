import { programmesController } from './controller.js'

const mockGetProjects = jest.fn()

jest.mock('~/src/server/services/projects.js', () => ({
  getProjects: (...args) => mockGetProjects(...args)
}))

describe('Programmes controller', () => {
  const mockH = {
    view: jest.fn()
  }
  const mockRequest = {
    logger: {
      error: jest.fn()
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    jest.resetModules()
  })

  describe('handler', () => {
    test('should return view with programmes data', async () => {
      // Arrange
      const mockProjects = [
        {
          name: 'Project 1',
          status: 'RED',
          tags: ['Portfolio: Future Farming', 'Type: Development']
        },
        {
          name: 'Project 2',
          status: 'AMBER',
          tags: ['Portfolio: Future Farming', 'Type: Infrastructure']
        },
        {
          name: 'Project 3',
          status: 'GREEN',
          tags: ['Portfolio: Environmental Protection', 'Type: Development']
        }
      ]
      mockGetProjects.mockResolvedValue(mockProjects)

      // Act
      await programmesController.handler(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('programmes/index', {
        pageTitle: 'Programmes | DDTS Assurance',
        programmes: [
          {
            name: 'Environmental Protection',
            projectCount: 1,
            redCount: 0,
            amberCount: 0,
            greenCount: 1
          },
          {
            name: 'Future Farming',
            projectCount: 2,
            redCount: 1,
            amberCount: 1,
            greenCount: 0
          }
        ]
      })
    })

    test('should handle errors appropriately', async () => {
      // Arrange
      const error = new Error('Test error')
      mockGetProjects.mockRejectedValue(error)

      // Act & Assert
      await expect(
        programmesController.handler(mockRequest, mockH)
      ).rejects.toThrow()
      expect(mockRequest.logger.error).toHaveBeenCalledWith(error)
    })
  })

  describe('getProgramme', () => {
    const mockParams = {
      programme: 'Future Farming'
    }

    test('should return view with programme details', async () => {
      // Arrange
      const mockProjects = [
        {
          id: '1',
          name: 'Project 1',
          status: 'RED',
          standards: [{ status: 'RED' }, { status: 'GREEN' }],
          tags: ['Portfolio: Future Farming', 'Type: Development']
        },
        {
          id: '2',
          name: 'Project 2',
          status: 'AMBER',
          standards: [{ status: 'AMBER' }],
          tags: ['Portfolio: Future Farming', 'Type: Infrastructure']
        }
      ]
      mockGetProjects.mockResolvedValue(mockProjects)

      // Act
      await programmesController.getProgramme(
        { ...mockRequest, params: mockParams },
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('programmes/detail', {
        pageTitle: 'Future Farming Programme | DDTS Assurance',
        programme: 'Future Farming',
        projects: [
          {
            name: 'Project 1',
            status: 'RED',
            standardsNotMet: 1,
            id: '1'
          },
          {
            name: 'Project 2',
            status: 'AMBER',
            standardsNotMet: 0,
            id: '2'
          }
        ]
      })
    })

    test('should handle project not found', async () => {
      // Arrange
      mockGetProjects.mockResolvedValue([])

      // Act
      await programmesController.getProgramme(
        { ...mockRequest, params: mockParams },
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('programmes/detail', {
        pageTitle: 'Future Farming Programme | DDTS Assurance',
        programme: 'Future Farming',
        projects: []
      })
    })

    test('should handle errors appropriately', async () => {
      // Arrange
      const error = new Error('Test error')
      mockGetProjects.mockRejectedValue(error)

      // Act & Assert
      await expect(
        programmesController.getProgramme(
          { ...mockRequest, params: mockParams },
          mockH
        )
      ).rejects.toThrow()
      expect(mockRequest.logger.error).toHaveBeenCalledWith(error)
    })
  })
})
