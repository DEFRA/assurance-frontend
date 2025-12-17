import { themesController } from './controller.js'

// Mock the themes service
jest.mock('~/src/server/services/themes.js', () => ({
  getThemes: jest.fn(),
  getAllThemes: jest.fn(),
  getThemeById: jest.fn(),
  createTheme: jest.fn(),
  updateTheme: jest.fn(),
  archiveTheme: jest.fn(),
  restoreTheme: jest.fn()
}))

// Mock the projects service
jest.mock('~/src/server/services/projects.js', () => ({
  getProjects: jest.fn()
}))

const {
  getThemes,
  getAllThemes,
  getThemeById,
  createTheme,
  updateTheme,
  archiveTheme,
  restoreTheme
} = jest.requireMock('~/src/server/services/themes.js')

const { getProjects } = jest.requireMock('~/src/server/services/projects.js')

describe('Themes Controller', () => {
  let mockH
  let mockRequest

  beforeEach(() => {
    jest.clearAllMocks()

    mockH = {
      view: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis()
    }

    mockRequest = {
      params: {},
      query: {},
      payload: {},
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      }
    }
  })

  describe('list', () => {
    it('should render themes list with active themes', async () => {
      const mockThemes = [
        {
          id: '1',
          name: 'Theme 1',
          description: 'Description 1',
          projectIds: ['proj-1'],
          isActive: true
        }
      ]
      getThemes.mockResolvedValue(mockThemes)

      await themesController.list(mockRequest, mockH)

      expect(getThemes).toHaveBeenCalledWith(mockRequest)
      expect(mockH.view).toHaveBeenCalledWith(
        'themes/views/index',
        expect.objectContaining({
          pageTitle: 'Key Themes',
          themes: expect.arrayContaining([
            expect.objectContaining({ id: '1', name: 'Theme 1' })
          ]),
          showArchived: false
        })
      )
    })

    it('should include archived themes when showArchived is true', async () => {
      mockRequest.query.showArchived = 'true'
      const mockThemes = [
        { id: '1', name: 'Active Theme', isActive: true },
        { id: '2', name: 'Archived Theme', isActive: false }
      ]
      getAllThemes.mockResolvedValue(mockThemes)

      await themesController.list(mockRequest, mockH)

      expect(getAllThemes).toHaveBeenCalledWith(mockRequest)
      expect(mockH.view).toHaveBeenCalledWith(
        'themes/views/index',
        expect.objectContaining({
          showArchived: true,
          themes: expect.arrayContaining([
            expect.objectContaining({ id: '1' }),
            expect.objectContaining({ id: '2' })
          ])
        })
      )
    })

    it('should handle errors', async () => {
      getThemes.mockRejectedValue(new Error('API Error'))

      await expect(themesController.list(mockRequest, mockH)).rejects.toThrow()
    })
  })

  describe('addForm', () => {
    it('should render add theme form with projects', async () => {
      const mockProjects = [
        { id: 'proj-1', name: 'Project 1' },
        { id: 'proj-2', name: 'Project 2' }
      ]
      getProjects.mockResolvedValue(mockProjects)

      await themesController.addForm(mockRequest, mockH)

      expect(getProjects).toHaveBeenCalledWith(mockRequest)
      expect(mockH.view).toHaveBeenCalledWith(
        'themes/views/add',
        expect.objectContaining({
          pageTitle: 'Add Theme',
          projects: mockProjects
        })
      )
    })
  })

  describe('create', () => {
    it('should create theme and redirect on success', async () => {
      mockRequest.payload = {
        name: 'New Theme',
        description: 'A new theme',
        projectIds: ['proj-1', 'proj-2']
      }
      createTheme.mockResolvedValue({ id: 'new-id' })

      await themesController.create(mockRequest, mockH)

      expect(createTheme).toHaveBeenCalledWith(
        {
          name: 'New Theme',
          description: 'A new theme',
          projectIds: ['proj-1', 'proj-2']
        },
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/themes?notification=created'
      )
    })

    it('should handle single projectId as array', async () => {
      mockRequest.payload = {
        name: 'Theme',
        description: 'Description',
        projectIds: 'single-proj-id'
      }
      createTheme.mockResolvedValue({ id: 'new-id' })

      await themesController.create(mockRequest, mockH)

      expect(createTheme).toHaveBeenCalledWith(
        expect.objectContaining({
          projectIds: ['single-proj-id']
        }),
        mockRequest
      )
    })

    it('should handle empty projectIds', async () => {
      mockRequest.payload = {
        name: 'Theme',
        description: 'Description'
      }
      createTheme.mockResolvedValue({ id: 'new-id' })

      await themesController.create(mockRequest, mockH)

      expect(createTheme).toHaveBeenCalledWith(
        expect.objectContaining({
          projectIds: []
        }),
        mockRequest
      )
    })

    it('should re-render form with error on failure', async () => {
      mockRequest.payload = {
        name: '',
        description: 'Description'
      }
      createTheme.mockRejectedValue(new Error('Validation failed'))
      getProjects.mockResolvedValue([])

      await themesController.create(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'themes/views/add',
        expect.objectContaining({
          error: 'Validation failed',
          values: mockRequest.payload
        })
      )
    })
  })

  describe('detail', () => {
    it('should render theme details', async () => {
      mockRequest.params.id = 'theme-1'
      const mockTheme = {
        id: 'theme-1',
        name: 'Test Theme',
        description: 'Description',
        projectIds: ['proj-1'],
        isActive: true
      }
      const mockProjects = [
        { id: 'proj-1', name: 'Project 1' },
        { id: 'proj-2', name: 'Project 2' }
      ]
      getThemeById.mockResolvedValue(mockTheme)
      getProjects.mockResolvedValue(mockProjects)

      await themesController.detail(mockRequest, mockH)

      expect(getThemeById).toHaveBeenCalledWith('theme-1', mockRequest)
      expect(mockH.view).toHaveBeenCalledWith(
        'themes/views/detail',
        expect.objectContaining({
          pageTitle: 'Test Theme',
          theme: expect.objectContaining({ id: 'theme-1' }),
          taggedProjects: expect.arrayContaining([
            expect.objectContaining({ id: 'proj-1' })
          ])
        })
      )
    })

    it('should return 404 when theme not found', async () => {
      mockRequest.params.id = 'non-existent'
      getThemeById.mockResolvedValue(null)

      await themesController.detail(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'errors/not-found',
        expect.objectContaining({
          pageTitle: 'Theme not found'
        })
      )
      expect(mockH.code).toHaveBeenCalledWith(404)
    })
  })

  describe('editForm', () => {
    it('should render edit form with theme and projects', async () => {
      mockRequest.params.id = 'theme-1'
      const mockTheme = {
        id: 'theme-1',
        name: 'Test Theme',
        description: 'Description',
        projectIds: ['proj-1'],
        isActive: true
      }
      const mockProjects = [{ id: 'proj-1', name: 'Project 1' }]
      getThemeById.mockResolvedValue(mockTheme)
      getProjects.mockResolvedValue(mockProjects)

      await themesController.editForm(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'themes/views/edit',
        expect.objectContaining({
          theme: expect.objectContaining({ id: 'theme-1' }),
          projects: mockProjects
        })
      )
    })

    it('should return 404 when theme not found', async () => {
      mockRequest.params.id = 'non-existent'
      getThemeById.mockResolvedValue(null)

      await themesController.editForm(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'errors/not-found',
        expect.any(Object)
      )
      expect(mockH.code).toHaveBeenCalledWith(404)
    })
  })

  describe('update', () => {
    it('should update theme and redirect on success', async () => {
      mockRequest.params.id = 'theme-1'
      mockRequest.payload = {
        name: 'Updated Theme',
        description: 'Updated description',
        projectIds: ['proj-1']
      }
      updateTheme.mockResolvedValue({ id: 'theme-1' })

      await themesController.update(mockRequest, mockH)

      expect(updateTheme).toHaveBeenCalledWith(
        'theme-1',
        expect.objectContaining({
          name: 'Updated Theme',
          projectIds: ['proj-1']
        }),
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/themes/theme-1?notification=updated'
      )
    })

    it('should re-render form with error on failure', async () => {
      mockRequest.params.id = 'theme-1'
      mockRequest.payload = {
        name: 'Invalid Update',
        description: 'Description'
      }
      updateTheme.mockRejectedValue(new Error('Update failed'))
      getThemeById.mockResolvedValue({ id: 'theme-1', name: 'Original' })
      getProjects.mockResolvedValue([])

      await themesController.update(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'themes/views/edit',
        expect.objectContaining({
          error: 'Update failed'
        })
      )
    })
  })

  describe('archive', () => {
    it('should archive theme and redirect', async () => {
      mockRequest.params.id = 'theme-1'
      archiveTheme.mockResolvedValue(undefined)

      await themesController.archive(mockRequest, mockH)

      expect(archiveTheme).toHaveBeenCalledWith('theme-1', mockRequest)
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/themes?notification=archived'
      )
    })

    it('should handle archive errors', async () => {
      mockRequest.params.id = 'theme-1'
      archiveTheme.mockRejectedValue(new Error('Archive failed'))

      await expect(
        themesController.archive(mockRequest, mockH)
      ).rejects.toThrow()
    })
  })

  describe('restore', () => {
    it('should restore theme and redirect', async () => {
      mockRequest.params.id = 'theme-1'
      restoreTheme.mockResolvedValue(undefined)

      await themesController.restore(mockRequest, mockH)

      expect(restoreTheme).toHaveBeenCalledWith('theme-1', mockRequest)
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/themes?notification=restored&showArchived=true'
      )
    })

    it('should handle restore errors', async () => {
      mockRequest.params.id = 'theme-1'
      restoreTheme.mockRejectedValue(new Error('Restore failed'))

      await expect(
        themesController.restore(mockRequest, mockH)
      ).rejects.toThrow()
    })
  })
})
