import { getDigitalAssistantBreadcrumbs } from '~/src/server/common/helpers/breadcrumbs.js'
import { handleChat } from '~/src/server/services/agentcore.js'

const VIEW_TEMPLATES = {
  DIGITAL_ASSISTANT: 'digital-assistant/views/index'
}

/**
 * Empty placeholder endpoint for future agent functionality.
 * @satisfies {Partial<ServerRoute>}
 */
export const digitalAssistantController = {
  get(request, h) {
    return h.view(VIEW_TEMPLATES.DIGITAL_ASSISTANT, {
      pageTitle: 'Digital Assistant | Defra Digital Assurance',
      heading: 'Digital Assistant',
      breadcrumbs: getDigitalAssistantBreadcrumbs(),
      promptValue: '',
      responseMessage: null
    })
  },

  async submit(request, h) {
    const prompt = request.payload?.prompt ?? request.payload?.Prompt ?? ''
    const responseMessage = await handleChat(prompt, request)
    return h.view(VIEW_TEMPLATES.DIGITAL_ASSISTANT, {
      pageTitle: 'Digital Assistant | Defra Digital Assurance',
      heading: 'Digital Assistant',
      breadcrumbs: getDigitalAssistantBreadcrumbs(),
      promptValue: prompt,
      responseMessage
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
