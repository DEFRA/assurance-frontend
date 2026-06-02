const ASSESSMENT_DRAFTS_KEY = 'assessmentDrafts'
const MAX_ASSESSMENT_DRAFTS = 20

function createAssessmentDraftKey(projectId, standardId, professionId) {
  return `${projectId}:${standardId}:${professionId}`
}

function getSessionId(request) {
  return (
    request.auth?.credentials?.id ?? request.state?.['assurance-session']?.id
  )
}

async function getCachedSession(request) {
  const sessionId = getSessionId(request)
  const sessionCache = request.server?.app?.sessionCache

  if (!sessionId || !sessionCache) {
    return { sessionId, sessionCache, session: null }
  }

  const session = await sessionCache.get(sessionId)
  return { sessionId, sessionCache, session }
}

function normaliseDrafts(session) {
  const drafts = session?.[ASSESSMENT_DRAFTS_KEY]
  return drafts && typeof drafts === 'object' && !Array.isArray(drafts)
    ? drafts
    : {}
}

function capDrafts(drafts) {
  return Object.fromEntries(
    Object.entries(drafts)
      .sort(([, firstDraft], [, secondDraft]) =>
        (secondDraft.timestamp ?? '').localeCompare(firstDraft.timestamp ?? '')
      )
      .slice(0, MAX_ASSESSMENT_DRAFTS)
  )
}

async function writeDraftsToSession(request, drafts) {
  const { sessionId, sessionCache, session } = await getCachedSession(request)

  if (!sessionId || !sessionCache || !session) {
    return false
  }

  await sessionCache.set(sessionId, {
    ...session,
    [ASSESSMENT_DRAFTS_KEY]: drafts
  })

  return true
}

async function getAssessmentDraft(
  request,
  projectId,
  standardId,
  professionId
) {
  const { session } = await getCachedSession(request)
  const drafts = normaliseDrafts(session)

  return (
    drafts[createAssessmentDraftKey(projectId, standardId, professionId)] ??
    null
  )
}

async function saveAssessmentDraft(
  request,
  projectId,
  standardId,
  professionId,
  draft
) {
  const { sessionId, sessionCache, session } = await getCachedSession(request)

  if (!sessionId || !sessionCache || !session) {
    return null
  }

  const draftKey = createAssessmentDraftKey(projectId, standardId, professionId)

  const drafts = capDrafts({
    ...normaliseDrafts(session),
    [draftKey]: {
      status: draft.status ?? '',
      commentary: draft.commentary ?? '',
      timestamp: new Date().toISOString()
    }
  })

  await sessionCache.set(sessionId, {
    ...session,
    [ASSESSMENT_DRAFTS_KEY]: drafts
  })

  return drafts[draftKey]
}

async function deleteAssessmentDraft(
  request,
  projectId,
  standardId,
  professionId
) {
  const { session } = await getCachedSession(request)

  if (!session) {
    return false
  }

  const drafts = { ...normaliseDrafts(session) }
  delete drafts[createAssessmentDraftKey(projectId, standardId, professionId)]

  return await writeDraftsToSession(request, drafts)
}

export {
  ASSESSMENT_DRAFTS_KEY,
  MAX_ASSESSMENT_DRAFTS,
  createAssessmentDraftKey,
  getAssessmentDraft,
  saveAssessmentDraft,
  deleteAssessmentDraft
}
