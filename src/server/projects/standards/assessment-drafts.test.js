import {
  ASSESSMENT_DRAFTS_KEY,
  createAssessmentDraftKey,
  deleteAssessmentDraft,
  getAssessmentDraft,
  saveAssessmentDraft
} from './assessment-drafts.js'

describe('assessment drafts', () => {
  let request
  let sessionCache
  let session

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-26T10:00:00.000Z'))

    session = {
      user: { id: 'user-1' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expires: 1790000000000
    }

    sessionCache = {
      get: jest.fn().mockResolvedValue(session),
      set: jest.fn().mockResolvedValue(true)
    }

    request = {
      auth: {
        credentials: {
          id: 'session-1'
        }
      },
      server: {
        app: {
          sessionCache
        }
      }
    }
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('saves a draft under assessmentDrafts and preserves existing session data', async () => {
    const draft = await saveAssessmentDraft(
      request,
      'project-1',
      'standard-1',
      'profession-1',
      {
        status: 'AMBER',
        commentary: 'Needs a plan'
      }
    )

    expect(draft).toEqual({
      status: 'AMBER',
      commentary: 'Needs a plan',
      timestamp: '2026-05-26T10:00:00.000Z'
    })
    expect(sessionCache.set).toHaveBeenCalledWith('session-1', {
      ...session,
      [ASSESSMENT_DRAFTS_KEY]: {
        'project-1:standard-1:profession-1': draft
      }
    })
  })

  test('loads a draft for the requested project, standard and profession', async () => {
    const draftKey = createAssessmentDraftKey(
      'project-1',
      'standard-1',
      'profession-1'
    )
    session[ASSESSMENT_DRAFTS_KEY] = {
      [draftKey]: {
        status: 'GREEN',
        commentary: 'Ready',
        timestamp: '2026-05-26T09:00:00.000Z'
      }
    }

    await expect(
      getAssessmentDraft(request, 'project-1', 'standard-1', 'profession-1')
    ).resolves.toEqual(session[ASSESSMENT_DRAFTS_KEY][draftKey])
  })

  test('deletes only the matching draft', async () => {
    session[ASSESSMENT_DRAFTS_KEY] = {
      'project-1:standard-1:profession-1': {
        status: 'GREEN',
        commentary: 'Ready',
        timestamp: '2026-05-26T09:00:00.000Z'
      },
      'project-1:standard-2:profession-1': {
        status: 'RED',
        commentary: 'Blocked',
        timestamp: '2026-05-26T09:30:00.000Z'
      }
    }

    await expect(
      deleteAssessmentDraft(request, 'project-1', 'standard-1', 'profession-1')
    ).resolves.toBe(true)

    expect(sessionCache.set).toHaveBeenCalledWith('session-1', {
      ...session,
      [ASSESSMENT_DRAFTS_KEY]: {
        'project-1:standard-2:profession-1': {
          status: 'RED',
          commentary: 'Blocked',
          timestamp: '2026-05-26T09:30:00.000Z'
        }
      }
    })
  })

  test('caps drafts to the 20 most recent combinations', async () => {
    session[ASSESSMENT_DRAFTS_KEY] = Object.fromEntries(
      Array.from({ length: 20 }, (_, index) => [
        `project-1:standard-${index}:profession-1`,
        {
          status: 'GREEN',
          commentary: `Draft ${index}`,
          timestamp: `2026-05-25T10:${String(index).padStart(2, '0')}:00.000Z`
        }
      ])
    )

    await saveAssessmentDraft(
      request,
      'project-1',
      'standard-new',
      'profession-1',
      {
        status: 'RED',
        commentary: 'Newest draft'
      }
    )

    const savedSession = sessionCache.set.mock.calls[0][1]
    expect(Object.keys(savedSession[ASSESSMENT_DRAFTS_KEY])).toHaveLength(20)
    expect(savedSession[ASSESSMENT_DRAFTS_KEY]).toHaveProperty(
      'project-1:standard-new:profession-1'
    )
    expect(savedSession[ASSESSMENT_DRAFTS_KEY]).not.toHaveProperty(
      'project-1:standard-0:profession-1'
    )
  })

  test('does not create a draft when the cached session is unavailable', async () => {
    sessionCache.get.mockResolvedValue(null)

    await expect(
      saveAssessmentDraft(request, 'project-1', 'standard-1', 'profession-1', {
        status: 'GREEN',
        commentary: 'Ready'
      })
    ).resolves.toBeNull()
    expect(sessionCache.set).not.toHaveBeenCalled()
  })
})
