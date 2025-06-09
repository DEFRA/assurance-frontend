import { hasAdminRole, hasAnyRole, getUserDisplayName } from './auth.js'

describe('Auth Helpers', () => {
  describe('hasAdminRole', () => {
    test('should return true when user has admin role', () => {
      // Arrange
      const user = {
        id: 'user-123',
        roles: ['admin', 'user']
      }

      // Act
      const result = hasAdminRole(user)

      // Assert
      expect(result).toBe(true)
    })

    test('should return true when user has only admin role', () => {
      // Arrange
      const user = {
        id: 'user-123',
        roles: ['admin']
      }

      // Act
      const result = hasAdminRole(user)

      // Assert
      expect(result).toBe(true)
    })

    test('should return false when user does not have admin role', () => {
      // Arrange
      const user = {
        id: 'user-123',
        roles: ['user', 'editor']
      }

      // Act
      const result = hasAdminRole(user)

      // Assert
      expect(result).toBe(false)
    })

    test('should return false when user has empty roles array', () => {
      // Arrange
      const user = {
        id: 'user-123',
        roles: []
      }

      // Act
      const result = hasAdminRole(user)

      // Assert
      expect(result).toBe(false)
    })

    test('should return false when user has no roles property', () => {
      // Arrange
      const user = {
        id: 'user-123'
      }

      // Act
      const result = hasAdminRole(user)

      // Assert
      expect(result).toBe(false)
    })

    test('should return false when user is null', () => {
      // Act
      const result = hasAdminRole(null)

      // Assert
      expect(result).toBe(false)
    })

    test('should return false when user is undefined', () => {
      // Act
      const result = hasAdminRole(undefined)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('hasAnyRole', () => {
    test('should return true when user has one of the required roles (string input)', () => {
      // Arrange
      const user = {
        id: 'user-123',
        roles: ['editor', 'user']
      }

      // Act
      const result = hasAnyRole(user, 'editor')

      // Assert
      expect(result).toBe(true)
    })

    test('should return true when user has one of the required roles (array input)', () => {
      // Arrange
      const user = {
        id: 'user-123',
        roles: ['user']
      }

      // Act
      const result = hasAnyRole(user, ['admin', 'editor', 'user'])

      // Assert
      expect(result).toBe(true)
    })

    test('should return true when user has multiple required roles', () => {
      // Arrange
      const user = {
        id: 'user-123',
        roles: ['admin', 'editor', 'user']
      }

      // Act
      const result = hasAnyRole(user, ['admin', 'editor'])

      // Assert
      expect(result).toBe(true)
    })

    test('should return false when user does not have any of the required roles', () => {
      // Arrange
      const user = {
        id: 'user-123',
        roles: ['guest']
      }

      // Act
      const result = hasAnyRole(user, ['admin', 'editor'])

      // Assert
      expect(result).toBe(false)
    })

    test('should return false when user has empty roles array', () => {
      // Arrange
      const user = {
        id: 'user-123',
        roles: []
      }

      // Act
      const result = hasAnyRole(user, ['admin', 'user'])

      // Assert
      expect(result).toBe(false)
    })

    test('should return false when user has no roles property', () => {
      // Arrange
      const user = {
        id: 'user-123'
      }

      // Act
      const result = hasAnyRole(user, 'admin')

      // Assert
      expect(result).toBe(false)
    })

    test('should return false when user is null', () => {
      // Act
      const result = hasAnyRole(null, 'admin')

      // Assert
      expect(result).toBe(false)
    })

    test('should return false when user is undefined', () => {
      // Act
      const result = hasAnyRole(undefined, ['admin', 'user'])

      // Assert
      expect(result).toBe(false)
    })

    test('should handle empty required roles array', () => {
      // Arrange
      const user = {
        id: 'user-123',
        roles: ['admin']
      }

      // Act
      const result = hasAnyRole(user, [])

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('getUserDisplayName', () => {
    test('should return user name when available', () => {
      // Arrange
      const user = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com'
      }

      // Act
      const result = getUserDisplayName(user)

      // Assert
      expect(result).toBe('John Doe')
    })

    test('should return email when name is not available', () => {
      // Arrange
      const user = {
        id: 'user-123',
        email: 'john@example.com'
      }

      // Act
      const result = getUserDisplayName(user)

      // Assert
      expect(result).toBe('john@example.com')
    })

    test('should return "Unknown user" when neither name nor email is available', () => {
      // Arrange
      const user = {
        id: 'user-123'
      }

      // Act
      const result = getUserDisplayName(user)

      // Assert
      expect(result).toBe('Unknown user')
    })

    test('should return "Unknown user" when user is null', () => {
      // Act
      const result = getUserDisplayName(null)

      // Assert
      expect(result).toBe('Unknown user')
    })

    test('should return "Unknown user" when user is undefined', () => {
      // Act
      const result = getUserDisplayName(undefined)

      // Assert
      expect(result).toBe('Unknown user')
    })

    test('should return name even when email is empty string', () => {
      // Arrange
      const user = {
        id: 'user-123',
        name: 'John Doe',
        email: ''
      }

      // Act
      const result = getUserDisplayName(user)

      // Assert
      expect(result).toBe('John Doe')
    })

    test('should return email when name is empty string', () => {
      // Arrange
      const user = {
        id: 'user-123',
        name: '',
        email: 'john@example.com'
      }

      // Act
      const result = getUserDisplayName(user)

      // Assert
      expect(result).toBe('john@example.com')
    })

    test('should return "Unknown user" when both name and email are empty strings', () => {
      // Arrange
      const user = {
        id: 'user-123',
        name: '',
        email: ''
      }

      // Act
      const result = getUserDisplayName(user)

      // Assert
      expect(result).toBe('Unknown user')
    })
  })
})
