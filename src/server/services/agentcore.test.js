import { SignatureV4 } from '@aws-sdk/signature-v4'
import { HttpRequest } from '@aws-sdk/protocol-http'
import { defaultProvider } from '@aws-sdk/credential-provider-node'
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers'
import { handleChat } from './agentcore.js'

jest.mock('@aws-sdk/signature-v4', () => ({
  SignatureV4: jest.fn()
}))

jest.mock('@aws-sdk/protocol-http', () => ({
  HttpRequest: jest.fn((input) => input)
}))

jest.mock('@aws-sdk/credential-provider-node', () => ({
  defaultProvider: jest.fn()
}))

jest.mock('@aws-sdk/credential-providers', () => ({
  fromTemporaryCredentials: jest.fn()
}))

jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn()
  }
}))

const { config } = jest.requireMock('~/src/config/config.js')

const getDefaultConfigValue = (key) => {
  const values = {
    'agentcore.gatewayUrl': 'https://agent.example.com',
    'agentcore.target': 'target',
    'agentcore.region': 'eu-west-2',
    'agentcore.service': 'service',
    'agentcore.timeoutMs': 10000,
    'agentcore.assumeRoleArn': null,
    'agentcore.assumeRoleExternalId': null,
    'agentcore.assumeRoleSessionName': null
  }

  return values[key]
}

const createSseResponse = (chunks) => {
  const encoded = chunks.map((chunk) => new TextEncoder().encode(chunk))
  let index = 0

  return {
    ok: true,
    status: 200,
    headers: {
      get: jest.fn(() => 'text/event-stream')
    },
    body: {
      getReader: () => ({
        read: jest.fn(() => {
          if (index >= encoded.length) {
            return { done: true, value: undefined }
          }

          const value = encoded[index]
          index += 1
          return { done: false, value }
        })
      })
    }
  }
}

describe('agentcore service', () => {
  let mockRequest
  let mockSigner
  let mockCredentialsProvider
  let mockAssumeRoleCredentialsProvider
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()

    global.fetch = jest.fn()
    mockCredentialsProvider = jest.fn()
    mockAssumeRoleCredentialsProvider = jest.fn()
    mockSigner = {
      sign: jest.fn()
    }

    defaultProvider.mockReturnValue(mockCredentialsProvider)
    fromTemporaryCredentials.mockReturnValue(mockAssumeRoleCredentialsProvider)
    SignatureV4.mockImplementation(() => mockSigner)
    config.get.mockImplementation(getDefaultConfigValue)

    mockRequest = {
      auth: {
        credentials: {
          agentcoreSessionId: '550e8400-e29b-41d4-a716-446655440000'
        }
      },
      logger: {
        warn: jest.fn(),
        error: jest.fn()
      }
    }
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  test('returns validation message for empty input', async () => {
    const result = await handleChat('   ', mockRequest)

    expect(result).toBe('Please enter a prompt before submitting.')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('returns configuration message when gateway URL is missing', async () => {
    config.get.mockImplementation((key) => {
      if (key === 'agentcore.gatewayUrl') {
        return null
      }

      return getDefaultConfigValue(key)
    })

    const result = await handleChat('Hello', mockRequest)

    expect(result).toBe('Digital Assistant is not configured yet.')
    expect(mockRequest.logger.warn).toHaveBeenCalledWith(
      'AgentCore gateway URL is not configured'
    )
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('returns credentials message when signing throws credential error', async () => {
    mockSigner.sign.mockRejectedValue(
      Object.assign(
        new Error('Could not load credentials from any providers'),
        {
          name: 'CredentialsProviderError'
        }
      )
    )

    const result = await handleChat('Hello', mockRequest)

    expect(result).toBe('Digital Assistant credentials are not configured yet.')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('submits signed request and returns message from JSON gateway response', async () => {
    mockSigner.sign.mockResolvedValue({
      headers: {
        'content-type': 'application/json',
        Authorization: 'AWS4-HMAC-SHA256 signed'
      }
    })

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: jest.fn(() => 'application/json')
      },
      json: jest.fn().mockResolvedValue({ message: 'Agent response text' })
    })

    const result = await handleChat('How are you?', mockRequest)

    expect(defaultProvider).toHaveBeenCalled()
    expect(SignatureV4).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'eu-west-2',
        service: 'service',
        credentials: mockCredentialsProvider
      })
    )

    expect(HttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: 'agent.example.com',
        path: '/target/invocations',
        method: 'POST',
        headers: expect.objectContaining({
          'x-amzn-bedrock-agentcore-runtime-session-id':
            '550e8400-e29b-41d4-a716-446655440000'
        }),
        body: JSON.stringify({ prompt: 'How are you?' })
      })
    )

    expect(global.fetch).toHaveBeenCalledWith(
      'https://agent.example.com/target/invocations',
      {
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'AWS4-HMAC-SHA256 signed'
        }),
        body: JSON.stringify({ prompt: 'How are you?' }),
        signal: expect.any(AbortSignal)
      }
    )

    expect(result).toBe('Agent response text')
  })

  test('assumes role when cross-account AgentCore role ARN is configured', async () => {
    config.get.mockImplementation((key) => {
      if (key === 'agentcore.assumeRoleArn') {
        return 'arn:aws:iam::123456789012:role/agentcore-cross-account'
      }

      if (key === 'agentcore.assumeRoleExternalId') {
        return 'external-id-value'
      }

      if (key === 'agentcore.assumeRoleSessionName') {
        return 'agentcore-cross-account-session'
      }

      return getDefaultConfigValue(key)
    })

    mockSigner.sign.mockResolvedValue({
      headers: {
        'content-type': 'application/json',
        Authorization: 'AWS4-HMAC-SHA256 signed'
      }
    })

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: jest.fn(() => 'application/json')
      },
      json: jest.fn().mockResolvedValue({ message: 'Agent response text' })
    })

    await handleChat('How are you?', mockRequest)

    expect(defaultProvider).toHaveBeenCalled()
    expect(fromTemporaryCredentials).toHaveBeenCalledWith({
      masterCredentials: mockCredentialsProvider,
      clientConfig: {
        region: 'eu-west-2'
      },
      params: {
        RoleArn: 'arn:aws:iam::123456789012:role/agentcore-cross-account',
        RoleSessionName: 'agentcore-cross-account-session',
        ExternalId: 'external-id-value'
      }
    })
    expect(SignatureV4).toHaveBeenCalledWith(
      expect.objectContaining({
        credentials: mockAssumeRoleCredentialsProvider
      })
    )
  })

  test('returns streamed content from event-stream response', async () => {
    mockSigner.sign.mockResolvedValue({
      headers: {
        'content-type': 'application/json',
        Authorization: 'AWS4-HMAC-SHA256 signed'
      }
    })

    global.fetch.mockResolvedValue(
      createSseResponse([
        'data: {"event":{"contentBlockDelta":{"delta":{"text":"Hello "}}}}\n',
        'data: {"event":{"contentBlockDelta":{"delta":{"text":"world"}}}}\n',
        'data: [DONE]\n'
      ])
    )

    const result = await handleChat('How are you?', mockRequest)

    expect(result).toBe('Hello world')
  })

  test('returns fallback message when gateway responds with non-ok status', async () => {
    mockSigner.sign.mockResolvedValue({
      headers: {
        'content-type': 'application/json',
        Authorization: 'AWS4-HMAC-SHA256 signed'
      }
    })

    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      headers: {
        get: jest.fn(() => 'application/json')
      }
    })

    const result = await handleChat('How are you?', mockRequest)

    expect(result).toBe(
      'Unable to get a response from Digital Assistant at the moment.'
    )
    expect(mockRequest.logger.error).toHaveBeenCalledWith(
      { statusCode: 500 },
      'AgentCore request failed'
    )
  })
})
