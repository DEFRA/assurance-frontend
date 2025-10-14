import {
  getHomeBreadcrumbs,
  getProjectsBreadcrumbs,
  getProjectDetailBreadcrumbs,
  getProjectSubPageBreadcrumbs,
  getDeliveryGroupsBreadcrumbs,
  getDeliveryGroupDetailBreadcrumbs,
  getDeliveryPartnersBreadcrumbs,
  getDeliveryPartnerDetailBreadcrumbs,
  getAdminBreadcrumbs,
  truncateBreadcrumbText
} from '~/src/server/common/helpers/breadcrumbs.js'

describe('Breadcrumb Helpers', () => {
  describe('getHomeBreadcrumbs', () => {
    it('should return empty array for home page', () => {
      const result = getHomeBreadcrumbs()
      expect(result).toEqual([])
    })
  })

  describe('getProjectsBreadcrumbs', () => {
    it('should return correct breadcrumbs for projects list page', () => {
      const result = getProjectsBreadcrumbs()
      expect(result).toEqual([
        {
          text: 'Home',
          href: '/'
        },
        {
          text: 'Deliveries'
        }
      ])
    })
  })

  describe('getProjectDetailBreadcrumbs', () => {
    it('should return correct breadcrumbs for project detail page', () => {
      const projectName = 'Test Project'
      const result = getProjectDetailBreadcrumbs(projectName)

      expect(result).toEqual([
        {
          text: 'Home',
          href: '/'
        },
        {
          text: 'Deliveries',
          href: '/projects'
        },
        {
          text: 'Test Project'
        }
      ])
    })

    it('should handle empty project name', () => {
      const result = getProjectDetailBreadcrumbs('')

      expect(result).toEqual([
        {
          text: 'Home',
          href: '/'
        },
        {
          text: 'Deliveries',
          href: '/projects'
        },
        {
          text: ''
        }
      ])
    })

    it('should handle null project name', () => {
      const result = getProjectDetailBreadcrumbs(null)

      expect(result).toEqual([
        {
          text: 'Home',
          href: '/'
        },
        {
          text: 'Deliveries',
          href: '/projects'
        },
        {
          text: null
        }
      ])
    })
  })

  describe('getProjectSubPageBreadcrumbs', () => {
    it('should return correct breadcrumbs for project sub-page', () => {
      const projectName = 'Alpha Project'
      const projectId = 'project-123'
      const subPageName = 'Standards'

      const result = getProjectSubPageBreadcrumbs(
        projectName,
        projectId,
        subPageName
      )

      expect(result).toEqual([
        {
          text: 'Home',
          href: '/'
        },
        {
          text: 'Deliveries',
          href: '/projects'
        },
        {
          text: 'Alpha Project',
          href: '/projects/project-123'
        },
        {
          text: 'Standards'
        }
      ])
    })

    it('should handle standard detail page', () => {
      const projectName = 'Beta Project'
      const projectId = 'project-456'
      const subPageName = 'Standard 1'

      const result = getProjectSubPageBreadcrumbs(
        projectName,
        projectId,
        subPageName
      )

      expect(result).toEqual([
        {
          text: 'Home',
          href: '/'
        },
        {
          text: 'Deliveries',
          href: '/projects'
        },
        {
          text: 'Beta Project',
          href: '/projects/project-456'
        },
        {
          text: 'Standard 1'
        }
      ])
    })

    it('should handle assessment history page', () => {
      const projectName = 'Gamma Project'
      const projectId = 'project-789'
      const subPageName = 'Standard 2 Assessment History'

      const result = getProjectSubPageBreadcrumbs(
        projectName,
        projectId,
        subPageName
      )

      expect(result).toEqual([
        {
          text: 'Home',
          href: '/'
        },
        {
          text: 'Deliveries',
          href: '/projects'
        },
        {
          text: 'Gamma Project',
          href: '/projects/project-789'
        },
        {
          text: 'Standard 2 Assessment History'
        }
      ])
    })
  })

  describe('getDeliveryGroupsBreadcrumbs', () => {
    it('should return correct breadcrumbs for delivery groups list page', () => {
      const result = getDeliveryGroupsBreadcrumbs()
      expect(result).toEqual([
        {
          text: 'Home',
          href: '/'
        },
        {
          text: 'Delivery Groups'
        }
      ])
    })
  })

  describe('getDeliveryGroupDetailBreadcrumbs', () => {
    it('should return correct breadcrumbs for delivery group detail page', () => {
      const groupName = 'Digital Services Group'
      const result = getDeliveryGroupDetailBreadcrumbs(groupName)

      expect(result).toEqual([
        {
          text: 'Home',
          href: '/'
        },
        {
          text: 'Digital Services Group'
        }
      ])
    })

    it('should handle empty group name', () => {
      const result = getDeliveryGroupDetailBreadcrumbs('')

      expect(result).toEqual([
        {
          text: 'Home',
          href: '/'
        },
        {
          text: ''
        }
      ])
    })

    it('should handle null group name', () => {
      const result = getDeliveryGroupDetailBreadcrumbs(null)

      expect(result).toEqual([
        {
          text: 'Home',
          href: '/'
        },
        {
          text: null
        }
      ])
    })
  })

  describe('getDeliveryPartnersBreadcrumbs', () => {
    it('should return correct breadcrumbs for delivery partners list page', () => {
      const result = getDeliveryPartnersBreadcrumbs()
      expect(result).toEqual([
        {
          text: 'Home',
          href: '/'
        },
        {
          text: 'Delivery Partners'
        }
      ])
    })
  })

  describe('getDeliveryPartnerDetailBreadcrumbs', () => {
    it('should return correct breadcrumbs for delivery partner detail page', () => {
      const partnerName = 'Acme Consulting'
      const result = getDeliveryPartnerDetailBreadcrumbs(partnerName)

      expect(result).toEqual([
        {
          text: 'Home',
          href: '/'
        },
        {
          text: 'Acme Consulting'
        }
      ])
    })

    it('should handle empty partner name', () => {
      const result = getDeliveryPartnerDetailBreadcrumbs('')

      expect(result).toEqual([
        {
          text: 'Home',
          href: '/'
        },
        {
          text: ''
        }
      ])
    })

    it('should handle null partner name', () => {
      const result = getDeliveryPartnerDetailBreadcrumbs(null)

      expect(result).toEqual([
        {
          text: 'Home',
          href: '/'
        },
        {
          text: null
        }
      ])
    })
  })

  describe('getAdminBreadcrumbs', () => {
    it('should return correct breadcrumbs for admin main page', () => {
      const result = getAdminBreadcrumbs()

      expect(result).toEqual([
        {
          text: 'Home',
          href: '/'
        },
        {
          text: 'Admin'
        }
      ])
    })

    it('should return correct breadcrumbs for admin sub-page', () => {
      const subPageName = 'User Management'
      const result = getAdminBreadcrumbs(subPageName)

      expect(result).toEqual([
        {
          text: 'Home',
          href: '/'
        },
        {
          text: 'Admin',
          href: '/admin'
        },
        {
          text: 'User Management'
        }
      ])
    })

    it('should handle empty sub-page name', () => {
      const result = getAdminBreadcrumbs('')

      expect(result).toEqual([
        {
          text: 'Home',
          href: '/'
        },
        {
          text: 'Admin'
        }
      ])
    })

    it('should handle null sub-page name', () => {
      const result = getAdminBreadcrumbs(null)

      expect(result).toEqual([
        {
          text: 'Home',
          href: '/'
        },
        {
          text: 'Admin'
        }
      ])
    })
  })

  describe('truncateBreadcrumbText', () => {
    it('should not truncate text shorter than max length', () => {
      const text = 'Short text'
      const result = truncateBreadcrumbText(text)
      expect(result).toBe('Short text')
    })

    it('should not truncate text equal to max length', () => {
      const text = 'A'.repeat(50) // Default max length is 50
      const result = truncateBreadcrumbText(text)
      expect(result).toBe(text)
    })

    it('should truncate text longer than max length', () => {
      const text = 'A'.repeat(60) // Longer than default max length of 50
      const result = truncateBreadcrumbText(text)
      expect(result).toBe('A'.repeat(47) + '...')
      expect(result).toHaveLength(50)
    })

    it('should use custom max length', () => {
      const text = 'This is a long text that should be truncated'
      const maxLength = 20
      const result = truncateBreadcrumbText(text, maxLength)
      expect(result).toBe('This is a long te...')
      expect(result).toHaveLength(20)
    })

    it('should handle very short max length', () => {
      const text = 'Hello World'
      const maxLength = 5
      const result = truncateBreadcrumbText(text, maxLength)
      expect(result).toBe('He...')
      expect(result).toHaveLength(5)
    })

    it('should handle empty text', () => {
      const result = truncateBreadcrumbText('')
      expect(result).toBe('')
    })

    it('should handle null text', () => {
      const result = truncateBreadcrumbText(null)
      expect(result).toBeNull()
    })

    it('should handle undefined text', () => {
      const result = truncateBreadcrumbText(undefined)
      expect(result).toBeUndefined()
    })

    it('should handle max length less than 3', () => {
      const text = 'Hello'
      const maxLength = 2
      const result = truncateBreadcrumbText(text, maxLength)
      // Should still add '...' even if maxLength is very small
      expect(result).toBe('...')
    })

    it('should handle edge case where text is exactly maxLength - 3', () => {
      const text = 'A'.repeat(47) // 47 characters
      const maxLength = 50
      const result = truncateBreadcrumbText(text, maxLength)
      expect(result).toBe(text) // Should not truncate
    })

    it('should handle edge case where text is maxLength - 2', () => {
      const text = 'A'.repeat(48) // 48 characters
      const maxLength = 50
      const result = truncateBreadcrumbText(text, maxLength)
      expect(result).toBe(text) // Should not truncate
    })

    it('should handle realistic project names', () => {
      const longProjectName =
        'Digital Transformation Initiative for Environmental Data Management System Phase 2'
      const result = truncateBreadcrumbText(longProjectName)
      expect(result).toBe('Digital Transformation Initiative for Environme...')
      expect(result).toHaveLength(50)
    })

    it('should handle realistic delivery group names', () => {
      const longGroupName =
        'Cross-Cutting Technical Services and Digital Innovation Team'
      const result = truncateBreadcrumbText(longGroupName)
      expect(result).toBe('Cross-Cutting Technical Services and Digital In...')
      expect(result).toHaveLength(50)
    })
  })
})
