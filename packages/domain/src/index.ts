// Domain layer exports
// This package contains business logic, domain entities, value objects, and ports (interfaces)

// Ports (interfaces for dependency inversion)
export * from './ports'

// Domain entities
export * from './entities/contact.entity'
export * from './entities/person.entity'

// Value objects
export * from './value-objects/email.vo'

// Domain services
export * from './services/contact-domain.service'
export * from './services/external-sync-domain.service'

// Events
export * from './events'
