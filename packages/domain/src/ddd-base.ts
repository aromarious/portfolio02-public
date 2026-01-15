// UUID generation with fallback
const getRandomUUID = (): string => {
  // Use Web Crypto API (available in browsers and Node.js 19+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback implementation for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Entity base class following DDD principles
 */
export abstract class Entity<T> {
  protected readonly _id: string
  protected props: T
  private readonly _isPersisted: boolean

  constructor(props: T & { id?: string }, isPersisted = false) {
    this._id = props.id || Entity.generateId()
    this.props = props as T
    this._isPersisted = isPersisted
  }

  get id(): string {
    return this._id
  }

  static generateId(): string {
    return getRandomUUID()
  }

  equals(entity: Entity<T>): boolean {
    if (!(entity instanceof Entity)) {
      return false
    }
    return this._id === entity._id
  }

  isPersisted(): boolean {
    return this._isPersisted
  }

  protected getProps(): T {
    return this.props
  }
}

/**
 * Value Object base class following DDD principles
 */
export abstract class ValueObject<T> {
  protected readonly props: T

  constructor(props: T) {
    this.props = Object.freeze(props)
  }

  equals(vo: ValueObject<T>): boolean {
    if (!(vo instanceof ValueObject)) {
      return false
    }
    return JSON.stringify(this.props) === JSON.stringify(vo.props)
  }
}

/**
 * Aggregate Root base class following DDD principles
 */
export abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: DomainEvent[] = []

  get domainEvents(): DomainEvent[] {
    return this._domainEvents
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event)
  }

  clearDomainEvents(): void {
    this._domainEvents = []
  }
}

/**
 * Domain Event interface
 */
export interface DomainEvent {
  readonly occurredOn: Date
  readonly eventId: string
  readonly eventType: string
}

/**
 * Base Domain Event class
 */
export abstract class BaseDomainEvent implements DomainEvent {
  readonly occurredOn: Date
  readonly eventId: string
  readonly eventType: string

  constructor(eventType: string) {
    this.occurredOn = new Date()
    this.eventId = Entity.generateId()
    this.eventType = eventType
  }
}
