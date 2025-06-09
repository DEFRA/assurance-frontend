# Frontend Logging Guidelines

## Overview

This document establishes consistent logging practices across the frontend application. All logging should follow these guidelines to ensure proper log aggregation, tracing, and debugging capabilities.

## When to Use Which Logger

### 1. Controllers (with Request Context) - Use `request.logger`

**When**: In any controller or handler that has access to the Hapi request object.

**Why**: Request loggers automatically include request context (trace IDs, request metadata) for better debugging and log correlation.

```javascript
export const projectsController = {
  get: async (request, h) => {
    try {
      request.logger.info('Fetching project details')
      // ... controller logic
    } catch (error) {
      request.logger.error({ error }, 'Failed to fetch project')
      throw error
    }
  }
}
```

### 2. Services/Utilities (without Request Context) - Use `import { logger }`

**When**: In service layers, utilities, or startup code where no request context exists.

**Why**: Provides singleton logger instance with consistent configuration.

```javascript
import { logger } from '~/src/server/common/helpers/logging/logger.js'

export async function getProjects(request) {
  try {
    logger.info({ endpoint: '/projects' }, 'Fetching projects from API')
    // ... service logic
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to fetch projects')
    throw error
  }
}
```

### 3. Deprecated - Avoid `createLogger()`

**⚠️ DEPRECATED**: The `createLogger()` function should not be used in new code. Use the appropriate pattern above instead.

## Log Format Standards

### 1. Structured Logging

Always use structured logging with context objects as the first parameter:

```javascript
// ✅ Good - Structured with context
logger.info(
  { projectId: '123', action: 'create' },
  'Project created successfully'
)

// ❌ Bad - String concatenation
logger.info('Project 123 created successfully with action create')
```

### 2. Error Logging

Include error details in a structured format:

```javascript
// ✅ Good - Structured error logging
logger.error(
  {
    error: error.message,
    stack: error.stack,
    code: error.code,
    projectId
  },
  'Failed to create project'
)

// ❌ Bad - Just logging the error object
logger.error(error)
```

### 3. Log Levels

Use appropriate log levels:

- **`trace`**: Very detailed debugging information
- **`debug`**: Detailed debugging information
- **`info`**: General application flow and important events
- **`warn`**: Potentially harmful situations that don't stop execution
- **`error`**: Error events that might still allow the application to continue
- **`fatal`**: Very severe error events that will likely lead the application to abort

```javascript
// Examples of appropriate usage
logger.info({ endpoint: '/api/projects' }, 'Making API request')
logger.warn({ data }, 'Invalid data returned from API, using fallback')
logger.error({ error: error.message }, 'API request failed')
```

## Configuration

### Log Levels

Log levels are configured via environment variables:

- **Development**: Defaults to `debug` level
- **Production**: Defaults to `info` level
- **Override**: Set `LOG_LEVEL` environment variable

### Log Format

- **Development**: Uses `pino-pretty` for readable console output
- **Production**: Uses ECS format for log aggregation systems

### Redaction

Sensitive data is automatically redacted in production:

- Authorization headers
- Cookie headers
- Other configured sensitive fields

## Examples

### Controller Example

```javascript
export const projectController = {
  handler: async (request, h) => {
    const { id } = request.params

    try {
      request.logger.info({ projectId: id }, 'Fetching project details')

      const project = await getProjectById(id, request)

      if (!project) {
        request.logger.warn({ projectId: id }, 'Project not found')
        return h.redirect('/?notification=project-not-found')
      }

      request.logger.info({ projectId: id }, 'Project retrieved successfully')
      return h.view('project-detail', { project })
    } catch (error) {
      request.logger.error(
        {
          error: error.message,
          stack: error.stack,
          projectId: id
        },
        'Error fetching project details'
      )

      throw Boom.boomify(error, { statusCode: 500 })
    }
  }
}
```

### Service Example

```javascript
import { logger } from '~/src/server/common/helpers/logging/logger.js'

export async function createProject(projectData, request) {
  try {
    logger.info({ projectData }, 'Creating new project')

    const result = await apiCall('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData)
    })

    logger.info(
      {
        projectId: result.id,
        projectName: result.name
      },
      'Project created successfully'
    )

    return result
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        projectData
      },
      'Failed to create project'
    )

    throw error
  }
}
```

## Testing

When writing tests, mock the logger appropriately:

```javascript
// For singleton logger
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}))

// For request.logger (automatically provided by Hapi)
const mockRequest = {
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}
```

## Migration from Old Patterns

If you encounter code using the deprecated `createLogger()` pattern:

1. **In Controllers**: Replace with `request.logger`
2. **In Services/Utilities**: Replace with `import { logger }`
3. **Remove** the `createLogger()` import and variable assignment

This ensures consistent logging across the application with proper request tracing and centralized configuration.
