import { Sha256 } from '@aws-crypto/sha256-js'
import { SignatureV4 } from '@aws-sdk/signature-v4'
import { HttpRequest } from '@aws-sdk/protocol-http'
import { config } from '~/src/config/config.js'
import { defaultProvider } from '@aws-sdk/credential-provider-node'
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers'

const CONFIG_KEYS = {
  gatewayUrl: 'agentcore.gatewayUrl',
  target: 'agentcore.target',
  region: 'agentcore.region',
  service: 'agentcore.service',
  timeoutMs: 'agentcore.timeoutMs',
  assumeRoleArn: 'agentcore.assumeRoleArn',
  assumeRoleExternalId: 'agentcore.assumeRoleExternalId',
  assumeRoleSessionName: 'agentcore.assumeRoleSessionName'
}

const FALLBACK_ERROR_MESSAGE =
  'Unable to get a response from Digital Assistant at the moment.'
const MISCONFIGURED_MESSAGE = 'Digital Assistant is not configured yet.'
const CREDENTIALS_ERROR_MESSAGE =
  'Digital Assistant credentials are not configured yet.'

const EMPTY_RESPONSE_MESSAGE = 'Digital Assistant returned an empty response.'

const isCredentialError = (errorName, errorMessage) =>
  /credential/i.test(errorName) || /credential/i.test(errorMessage)

const extractMessage = (responseBody) => {
  if (!responseBody) {
    return ''
  }

  if (typeof responseBody === 'string') {
    return responseBody
  }

  return (
    responseBody.message ??
    responseBody.output ??
    responseBody.response ??
    responseBody.answer ??
    responseBody.data?.message ??
    ''
  )
}

const extractStreamText = (eventPayload) => {
  if (!eventPayload || eventPayload === '[DONE]') {
    return ''
  }

  try {
    const parsed = JSON.parse(eventPayload)

    return (
      parsed?.event?.contentBlockDelta?.delta?.text ??
      parsed?.delta?.text ??
      parsed?.outputText ??
      extractMessage(parsed)
    )
  } catch {
    return ''
  }
}

const getSsePayload = (line) => {
  const trimmedLine = line.trim()

  if (!trimmedLine) {
    return ''
  }

  return trimmedLine.startsWith('data:')
    ? trimmedLine.slice('data:'.length).trim()
    : trimmedLine
}

const readAgentStream = async (response) => {
  if (!response.body) {
    return ''
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let output = ''

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const rawLine of lines) {
      output += extractStreamText(getSsePayload(rawLine))
    }
  }

  output += extractStreamText(getSsePayload(buffer))

  return output
}

const getResponseMessage = async (response) => {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('text/event-stream')) {
    return readAgentStream(response)
  }

  if (contentType.includes('application/json')) {
    return extractMessage(await response.json())
  }

  return extractMessage(await response.text())
}

const getRequestContext = (prompt, request) => {
  const gatewayUrl = config.get(CONFIG_KEYS.gatewayUrl)
  const target = config.get(CONFIG_KEYS.target)

  if (typeof gatewayUrl !== 'string' || !gatewayUrl) {
    request.logger?.warn('AgentCore gateway URL is not configured')
    return {
      message: MISCONFIGURED_MESSAGE
    }
  }

  if (typeof target !== 'string' || !target) {
    request.logger?.warn('AgentCore target is not configured')
    return {
      message: MISCONFIGURED_MESSAGE
    }
  }

  return {
    endpoint: new URL(`${gatewayUrl}/${target}/invocations`),
    region: config.get(CONFIG_KEYS.region),
    service: config.get(CONFIG_KEYS.service),
    timeoutMs: config.get(CONFIG_KEYS.timeoutMs),
    assumeRoleArn: config.get(CONFIG_KEYS.assumeRoleArn),
    assumeRoleExternalId: config.get(CONFIG_KEYS.assumeRoleExternalId),
    assumeRoleSessionName: config.get(CONFIG_KEYS.assumeRoleSessionName),
    sessionId: request.auth?.credentials?.agentcoreSessionId,
    requestBody: JSON.stringify({ prompt })
  }
}

const getCredentialsProvider = ({
  region,
  assumeRoleArn,
  assumeRoleExternalId,
  assumeRoleSessionName
}) => {
  const baseCredentialsProvider = defaultProvider()

  if (typeof assumeRoleArn !== 'string' || !assumeRoleArn) {
    return baseCredentialsProvider
  }

  const assumeRoleParams = {
    RoleArn: assumeRoleArn,
    RoleSessionName:
      assumeRoleSessionName || 'assurance-frontend-agentcore-runtime'
  }

  if (typeof assumeRoleExternalId === 'string' && assumeRoleExternalId) {
    assumeRoleParams.ExternalId = assumeRoleExternalId
  }

  return fromTemporaryCredentials({
    masterCredentials: baseCredentialsProvider,
    clientConfig: {
      region
    },
    params: assumeRoleParams
  })
}

const sendSignedRequest = async (prompt, request) => {
  const requestContext = getRequestContext(prompt, request)

  if (requestContext.message) {
    return requestContext
  }

  const { endpoint, region, service, timeoutMs, sessionId, requestBody } =
    requestContext
  const credentialsProvider = getCredentialsProvider(requestContext)

  const signer = new SignatureV4({
    service,
    region,
    credentials: credentialsProvider,
    sha256: Sha256
  })

  const headers = {
    'content-type': 'application/json',
    host: endpoint.hostname,
    accept: 'text/event-stream'
  }

  if (sessionId) {
    headers['x-amzn-bedrock-agentcore-runtime-session-id'] = sessionId
  }

  const unsignedRequest = new HttpRequest({
    protocol: endpoint.protocol,
    hostname: endpoint.hostname,
    method: 'POST',
    path: endpoint.pathname,
    headers,
    body: requestBody
  })

  const signedRequest = await signer.sign(unsignedRequest)

  const response = await fetch(endpoint.toString(), {
    method: 'POST',
    headers: signedRequest.headers,
    body: requestBody,
    signal: AbortSignal.timeout(timeoutMs)
  })

  return {
    response
  }
}

/**
 * Submit text input to the AgentCore gateway using AWS IAM SigV4 signing.
 * @param {string} inputText - User input text
 * @param {object} request - Hapi request object
 * @returns {Promise<string>} Agent response message
 */
export const handleChat = async (inputText, request) => {
  const prompt = typeof inputText === 'string' ? inputText.trim() : ''

  if (!prompt) {
    return 'Please enter a prompt before submitting.'
  }

  try {
    const result = await sendSignedRequest(prompt, request)

    if (result.message) {
      return result.message
    }

    const { response } = result

    if (!response.ok) {
      request.logger?.error(
        { statusCode: response.status },
        'AgentCore request failed'
      )
      return FALLBACK_ERROR_MESSAGE
    }

    const message = await getResponseMessage(response)

    return message || EMPTY_RESPONSE_MESSAGE
  } catch (error) {
    const errorName = error?.name ?? 'Error'
    const errorMessage = error?.message ?? 'Unknown error'

    if (isCredentialError(errorName, errorMessage)) {
      return CREDENTIALS_ERROR_MESSAGE
    }

    request.logger?.error(
      {
        errorName,
        errorMessage,
        errorCause: error?.cause
      },
      'AgentCore request error'
    )
    return FALLBACK_ERROR_MESSAGE
  }
}
