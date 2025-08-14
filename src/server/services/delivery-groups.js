// Mock delivery groups service - frontend only implementation
// This will be replaced with actual API calls when backend is implemented

const mockDeliveryGroups = [
  {
    id: 'delivery-group-1',
    name: 'Frontend Development Team',
    isActive: true,
    createdAt: '2024-01-15T09:00:00.000Z',
    updatedAt: '2024-01-15T09:00:00.000Z'
  },
  {
    id: 'delivery-group-2',
    name: 'Backend Services Team',
    isActive: true,
    createdAt: '2024-01-16T10:30:00.000Z',
    updatedAt: '2024-01-16T10:30:00.000Z'
  },
  {
    id: 'delivery-group-3',
    name: 'DevOps and Infrastructure',
    isActive: false,
    createdAt: '2024-01-17T14:15:00.000Z',
    updatedAt: '2024-01-18T09:20:00.000Z'
  }
]

// Helper function to generate unique IDs
const generateId = (name) => {
  const timestamp = Date.now()
  const cleanName = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  return `delivery-group-${cleanName}-${timestamp}`
}

export const getDeliveryGroups = async (request) => {
  request.logger?.info('Fetching delivery groups (mock data)')

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 50))

  // Return only active groups by default (like professions service)
  return mockDeliveryGroups
    .filter((g) => g.isActive)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export const getAllDeliveryGroups = async (request) => {
  request.logger?.info(
    'Fetching all delivery groups including archived (mock data)'
  )

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 50))

  // Return all groups (active and archived)
  return mockDeliveryGroups.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )
}

export const getDeliveryGroupById = async (id, request) => {
  request.logger?.info({ id }, 'Fetching delivery group by ID (mock data)')

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 30))

  const group = mockDeliveryGroups.find((g) => g.id === id)
  if (!group) {
    throw new Error(`Delivery group with ID ${id} not found`)
  }

  return group
}

export const createDeliveryGroup = async (groupData, request) => {
  request.logger?.info({ groupData }, 'Creating delivery group (mock data)')

  // Validate required fields
  if (!groupData.name || groupData.name.trim().length === 0) {
    throw new Error('Name is required')
  }

  if (groupData.name.length > 100) {
    throw new Error('Name must be 100 characters or less')
  }

  // Check for duplicate names among active groups
  const existingGroup = mockDeliveryGroups.find(
    (g) => g.isActive && g.name.toLowerCase() === groupData.name.toLowerCase()
  )
  if (existingGroup) {
    throw new Error('A delivery group with this name already exists')
  }

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100))

  const newGroup = {
    id: generateId(groupData.name),
    name: groupData.name.trim(),
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  mockDeliveryGroups.push(newGroup)
  return newGroup
}

export const updateDeliveryGroup = async (id, updateData, request) => {
  request.logger?.info(
    { id, updateData },
    'Updating delivery group (mock data)'
  )

  const groupIndex = mockDeliveryGroups.findIndex((g) => g.id === id)
  if (groupIndex === -1) {
    throw new Error(`Delivery group with ID ${id} not found`)
  }

  // Validate required fields
  if (!updateData.name || updateData.name.trim().length === 0) {
    throw new Error('Name is required')
  }

  if (updateData.name.length > 100) {
    throw new Error('Name must be 100 characters or less')
  }

  // Check for duplicate names among active groups (excluding current group)
  const existingGroup = mockDeliveryGroups.find(
    (g) =>
      g.id !== id &&
      g.isActive &&
      g.name.toLowerCase() === updateData.name.toLowerCase()
  )
  if (existingGroup) {
    throw new Error('A delivery group with this name already exists')
  }

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 80))

  mockDeliveryGroups[groupIndex] = {
    ...mockDeliveryGroups[groupIndex],
    name: updateData.name.trim(),
    updatedAt: new Date().toISOString()
  }

  return mockDeliveryGroups[groupIndex]
}

export const deleteDeliveryGroup = async (id, request) => {
  request.logger?.info({ id }, 'Archiving delivery group (mock data)')

  const groupIndex = mockDeliveryGroups.findIndex((g) => g.id === id)
  if (groupIndex === -1) {
    throw new Error(`Delivery group with ID ${id} not found`)
  }

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 60))

  // Archive instead of delete
  mockDeliveryGroups[groupIndex] = {
    ...mockDeliveryGroups[groupIndex],
    isActive: false,
    updatedAt: new Date().toISOString()
  }

  return mockDeliveryGroups[groupIndex]
}

export const restoreDeliveryGroup = async (id, request) => {
  request.logger?.info({ id }, 'Restoring delivery group (mock data)')

  const groupIndex = mockDeliveryGroups.findIndex((g) => g.id === id)
  if (groupIndex === -1) {
    throw new Error(`Delivery group with ID ${id} not found`)
  }

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 60))

  // Restore from archive
  mockDeliveryGroups[groupIndex] = {
    ...mockDeliveryGroups[groupIndex],
    isActive: true,
    updatedAt: new Date().toISOString()
  }

  return mockDeliveryGroups[groupIndex]
}
