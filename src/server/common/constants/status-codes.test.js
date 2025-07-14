import { statusCodes } from './status-codes.js'
import { statusCodeMessage } from '../helpers/errors.js'

describe('Status Codes Constants', () => {
  describe('statusCodes', () => {
    test('should have correct HTTP status code values', () => {
      // Test common status codes
      expect(statusCodes.ok).toBe(200)
      expect(statusCodes.created).toBe(201)
      expect(statusCodes.badRequest).toBe(400)
      expect(statusCodes.unauthorized).toBe(401)
      expect(statusCodes.forbidden).toBe(403)
      expect(statusCodes.notFound).toBe(404)
      expect(statusCodes.internalServerError).toBe(500)
      expect(statusCodes.badGateway).toBe(502)
      expect(statusCodes.serviceUnavailable).toBe(503)
    })

    test('should have all required status codes defined', () => {
      const requiredCodes = [
        'ok',
        'created',
        'badRequest',
        'unauthorized',
        'forbidden',
        'notFound',
        'internalServerError',
        'badGateway',
        'serviceUnavailable'
      ]

      requiredCodes.forEach((code) => {
        expect(statusCodes[code]).toBeDefined()
        expect(typeof statusCodes[code]).toBe('number')
      })
    })
  })

  describe('statusCodeMessage', () => {
    test('should return correct messages for known status codes', () => {
      expect(statusCodeMessage(200)).toBe('OK')
      expect(statusCodeMessage(400)).toBe('Bad Request')
      expect(statusCodeMessage(401)).toBe('Unauthorized')
      expect(statusCodeMessage(403)).toBe('Forbidden')
      expect(statusCodeMessage(404)).toBe('Page not found')
      expect(statusCodeMessage(500)).toBe('Something went wrong')
      expect(statusCodeMessage(502)).toBe('Something went wrong')
      expect(statusCodeMessage(503)).toBe('Something went wrong')
    })

    test('should return default message for unknown status codes', () => {
      expect(statusCodeMessage(418)).toBe('Something went wrong') // I'm a teapot
      expect(statusCodeMessage(999)).toBe('Something went wrong') // Non-existent code
    })

    test('should handle edge case status codes', () => {
      expect(statusCodeMessage(0)).toBe('Something went wrong')
      expect(statusCodeMessage(-1)).toBe('Something went wrong')
      expect(statusCodeMessage(null)).toBe('Something went wrong')
      expect(statusCodeMessage(undefined)).toBe('Something went wrong')
    })

    test('should handle all 4xx and 5xx status codes with appropriate messages', () => {
      // Test that 4xx errors get specific messages where defined
      expect(statusCodeMessage(400)).toBe('Bad Request')
      expect(statusCodeMessage(429)).toBe('Something went wrong') // Rate limited - falls back

      // Test that 5xx errors get "Something went wrong"
      expect(statusCodeMessage(500)).toBe('Something went wrong')
      expect(statusCodeMessage(501)).toBe('Something went wrong')
      expect(statusCodeMessage(503)).toBe('Something went wrong')
    })
  })
})
