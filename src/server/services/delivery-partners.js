// Mock delivery partners service - frontend only implementation
// This will be replaced with actual API calls when backend is implemented

const mockDeliveryPartners = [
  {
    id: 'delivery-partner-1',
    name: 'Acme Solutions Ltd',
    isActive: true,
    createdAt: '2024-01-10T08:30:00.000Z',
    updatedAt: '2024-01-10T08:30:00.000Z'
  },
  {
    id: 'delivery-partner-2',
    name: 'TechFlow Consulting',
    isActive: true,
    createdAt: '2024-01-12T11:45:00.000Z',
    updatedAt: '2024-01-12T11:45:00.000Z'
  },
  {
    id: 'delivery-partner-3',
    name: 'Digital Solutions Partnership',
    isActive: false,
    createdAt: '2024-01-14T16:20:00.000Z',
    updatedAt: '2024-01-19T10:15:00.000Z'
  },
  {
    id: 'delivery-partner-4',
    name: 'CloudFirst Technologies',
    isActive: true,
    createdAt: '2024-01-18T13:10:00.000Z',
    updatedAt: '2024-01-18T13:10:00.000Z'
  }
]

// Helper function to generate unique IDs
const generateId = (name) => {
  const timestamp = Date.now()
  const cleanName = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  return `delivery-partner-${cleanName}-${timestamp}`
}

export const getDeliveryPartners = async (request) => {
  request.logger?.info('Fetching delivery partners (mock data)')

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 50))

  // Return only active partners by default (like professions service)
  return mockDeliveryPartners
    .filter((p) => p.isActive)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export const getAllDeliveryPartners = async (request) => {
  request.logger?.info(
    'Fetching all delivery partners including archived (mock data)'
  )

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 50))

  // Return all partners (active and archived)
  return mockDeliveryPartners.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )
}

export const getDeliveryPartnerById = async (id, request) => {
  request.logger?.info({ id }, 'Fetching delivery partner by ID (mock data)')

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 30))

  const partner = mockDeliveryPartners.find((p) => p.id === id)
  if (!partner) {
    throw new Error(`Delivery partner with ID ${id} not found`)
  }

  return partner
}

export const createDeliveryPartner = async (partnerData, request) => {
  request.logger?.info({ partnerData }, 'Creating delivery partner (mock data)')

  // Validate required fields
  if (!partnerData.name || partnerData.name.trim().length === 0) {
    throw new Error('Name is required')
  }

  if (partnerData.name.length > 100) {
    throw new Error('Name must be 100 characters or less')
  }

  // Check for duplicate names among active partners
  const existingPartner = mockDeliveryPartners.find(
    (p) => p.isActive && p.name.toLowerCase() === partnerData.name.toLowerCase()
  )
  if (existingPartner) {
    throw new Error('A delivery partner with this name already exists')
  }

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100))

  const newPartner = {
    id: generateId(partnerData.name),
    name: partnerData.name.trim(),
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  mockDeliveryPartners.push(newPartner)
  return newPartner
}

export const updateDeliveryPartner = async (id, updateData, request) => {
  request.logger?.info(
    { id, updateData },
    'Updating delivery partner (mock data)'
  )

  const partnerIndex = mockDeliveryPartners.findIndex((p) => p.id === id)
  if (partnerIndex === -1) {
    throw new Error(`Delivery partner with ID ${id} not found`)
  }

  // Validate required fields
  if (!updateData.name || updateData.name.trim().length === 0) {
    throw new Error('Name is required')
  }

  if (updateData.name.length > 100) {
    throw new Error('Name must be 100 characters or less')
  }

  // Check for duplicate names among active partners (excluding current partner)
  const existingPartner = mockDeliveryPartners.find(
    (p) =>
      p.id !== id &&
      p.isActive &&
      p.name.toLowerCase() === updateData.name.toLowerCase()
  )
  if (existingPartner) {
    throw new Error('A delivery partner with this name already exists')
  }

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 80))

  mockDeliveryPartners[partnerIndex] = {
    ...mockDeliveryPartners[partnerIndex],
    name: updateData.name.trim(),
    updatedAt: new Date().toISOString()
  }

  return mockDeliveryPartners[partnerIndex]
}

export const deleteDeliveryPartner = async (id, request) => {
  request.logger?.info({ id }, 'Archiving delivery partner (mock data)')

  const partnerIndex = mockDeliveryPartners.findIndex((p) => p.id === id)
  if (partnerIndex === -1) {
    throw new Error(`Delivery partner with ID ${id} not found`)
  }

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 60))

  // Archive instead of delete
  mockDeliveryPartners[partnerIndex] = {
    ...mockDeliveryPartners[partnerIndex],
    isActive: false,
    updatedAt: new Date().toISOString()
  }

  return mockDeliveryPartners[partnerIndex]
}

export const restoreDeliveryPartner = async (id, request) => {
  request.logger?.info({ id }, 'Restoring delivery partner (mock data)')

  const partnerIndex = mockDeliveryPartners.findIndex((p) => p.id === id)
  if (partnerIndex === -1) {
    throw new Error(`Delivery partner with ID ${id} not found`)
  }

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 60))

  // Restore from archive
  mockDeliveryPartners[partnerIndex] = {
    ...mockDeliveryPartners[partnerIndex],
    isActive: true,
    updatedAt: new Date().toISOString()
  }

  return mockDeliveryPartners[partnerIndex]
}
