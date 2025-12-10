import { insightsController } from './controller.js'
import { getPrioritisationData } from '~/src/server/services/insights.js'

// Mock the insights service
jest.mock('~/src/server/services/insights.js', () => ({
  getPrioritisationData: jest.fn()
}))

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}

// Sample API response data
const mockApiResponse = {
  deliveriesNeedingStandardUpdates: [
    {
      id: 'proj-1',
      name: 'Animal Health Platform',
      status: 'AMBER',
      lastServiceStandardUpdate: '2025-10-02T10:30:00Z',
      daysSinceStandardUpdate: 60
    },
    {
      id: 'proj-2',
      name: 'Farming Investment Fund Portal',
      status: 'RED',
      lastServiceStandardUpdate: '2025-10-20T10:30:00Z',
      daysSinceStandardUpdate: 42
    }
  ],
  deliveriesWithWorseningStandards: [
    {
      id: 'proj-2',
      name: 'Farming Investment Fund Portal',
      status: 'RED',
      standardChanges: [
        {
          standardNumber: 1,
          standardName: 'Understand users and their needs',
          statusHistory: ['GREEN', 'GREEN', 'AMBER'] // 3 entries
        },
        {
          standardNumber: 5,
          standardName: 'Make sure everyone can use the service',
          statusHistory: ['RED'] // First-time RED (1 entry)
        }
      ]
    }
  ]
}

describe('Insights Controller', () => {
  let mockH
  let mockRequest

  beforeEach(() => {
    jest.clearAllMocks()

    mockH = {
      view: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis()
    }

    mockRequest = {
      query: {},
      auth: {
        isAuthenticated: true,
        credentials: {
          token: 'test-token'
        }
      },
      logger: mockLogger
    }

    // Default mock implementation
    getPrioritisationData.mockResolvedValue(mockApiResponse)
  })

  describe('getPrioritisation handler', () => {
    it('should return view with prioritisation data from API', async () => {
      await insightsController.getPrioritisation(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'insights/views/index',
        expect.objectContaining({
          pageTitle: 'Weekly Prioritisation',
          heading: 'Weekly Prioritisation',
          subheading: 'Deliveries requiring attention based on update history',
          deliveriesNeedingStandardUpdates:
            mockApiResponse.deliveriesNeedingStandardUpdates,
          deliveriesWithWorseningStandards:
            mockApiResponse.deliveriesWithWorseningStandards,
          thresholds: expect.objectContaining({
            standard: 14
          }),
          breadcrumbs: expect.any(Array)
        })
      )
    })

    it('should call getPrioritisationData with default thresholds', async () => {
      await insightsController.getPrioritisation(mockRequest, mockH)

      expect(getPrioritisationData).toHaveBeenCalledWith(mockRequest, {
        standardThreshold: 14,
        worseningDays: 14
      })
    })

    it('should call getPrioritisationData with custom thresholds from query params', async () => {
      mockRequest.query = {
        standardThreshold: '21',
        worseningDays: '7'
      }

      await insightsController.getPrioritisation(mockRequest, mockH)

      expect(getPrioritisationData).toHaveBeenCalledWith(mockRequest, {
        standardThreshold: 21,
        worseningDays: 7
      })
    })

    it('should use custom threshold from query params in view', async () => {
      mockRequest.query = {
        standardThreshold: '21'
      }

      await insightsController.getPrioritisation(mockRequest, mockH)

      const viewArgs = mockH.view.mock.calls[0][1]
      expect(viewArgs.thresholds).toEqual({
        standard: 21
      })
    })

    it('should default to 14 day threshold if not provided', async () => {
      await insightsController.getPrioritisation(mockRequest, mockH)

      const viewArgs = mockH.view.mock.calls[0][1]
      expect(viewArgs.thresholds).toEqual({
        standard: 14
      })
    })

    it('should include breadcrumbs', async () => {
      await insightsController.getPrioritisation(mockRequest, mockH)

      const viewArgs = mockH.view.mock.calls[0][1]
      expect(viewArgs.breadcrumbs).toEqual([
        { text: 'Home', href: '/' },
        { text: 'Insights', href: '/insights/prioritisation' }
      ])
    })

    it('should log info message on page load', async () => {
      await insightsController.getPrioritisation(mockRequest, mockH)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Insights prioritisation page - loading data'
      )
    })

    it('should log count of deliveries found', async () => {
      await insightsController.getPrioritisation(mockRequest, mockH)

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Found 2 deliveries needing updates')
      )
    })

    it('should handle empty API response', async () => {
      getPrioritisationData.mockResolvedValue({
        deliveriesNeedingStandardUpdates: [],
        deliveriesWithWorseningStandards: []
      })

      await insightsController.getPrioritisation(mockRequest, mockH)

      const viewArgs = mockH.view.mock.calls[0][1]
      expect(viewArgs.deliveriesNeedingStandardUpdates).toEqual([])
      expect(viewArgs.deliveriesWithWorseningStandards).toEqual([])
    })

    it('should handle null/undefined API response fields', async () => {
      getPrioritisationData.mockResolvedValue({})

      await insightsController.getPrioritisation(mockRequest, mockH)

      const viewArgs = mockH.view.mock.calls[0][1]
      expect(viewArgs.deliveriesNeedingStandardUpdates).toEqual([])
      expect(viewArgs.deliveriesWithWorseningStandards).toEqual([])
    })

    it('should throw error when API call fails', async () => {
      const apiError = new Error('API connection failed')
      getPrioritisationData.mockRejectedValue(apiError)

      await expect(
        insightsController.getPrioritisation(mockRequest, mockH)
      ).rejects.toThrow('API connection failed')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error loading insights prioritisation page:',
        apiError
      )
    })

    it('should pass deliveries with correct structure to view', async () => {
      await insightsController.getPrioritisation(mockRequest, mockH)

      const viewArgs = mockH.view.mock.calls[0][1]
      const firstDelivery = viewArgs.deliveriesNeedingStandardUpdates[0]

      expect(firstDelivery).toHaveProperty('id')
      expect(firstDelivery).toHaveProperty('name')
      expect(firstDelivery).toHaveProperty('status')
      expect(firstDelivery).toHaveProperty('daysSinceStandardUpdate')
    })

    it('should pass worsening standards with correct structure to view', async () => {
      await insightsController.getPrioritisation(mockRequest, mockH)

      const viewArgs = mockH.view.mock.calls[0][1]
      const firstWorsening = viewArgs.deliveriesWithWorseningStandards[0]

      expect(firstWorsening).toHaveProperty('id')
      expect(firstWorsening).toHaveProperty('name')
      expect(firstWorsening).toHaveProperty('status')
      expect(firstWorsening).toHaveProperty('standardChanges')
      expect(Array.isArray(firstWorsening.standardChanges)).toBe(true)
    })

    it('should pass standard changes with status history to view', async () => {
      await insightsController.getPrioritisation(mockRequest, mockH)

      const viewArgs = mockH.view.mock.calls[0][1]
      const firstChange =
        viewArgs.deliveriesWithWorseningStandards[0].standardChanges[0]

      expect(firstChange).toHaveProperty('standardNumber')
      expect(firstChange).toHaveProperty('standardName')
      expect(firstChange).toHaveProperty('statusHistory')
      expect(Array.isArray(firstChange.statusHistory)).toBe(true)
      expect(firstChange.statusHistory.length).toBeGreaterThanOrEqual(1)
    })
  })
})
