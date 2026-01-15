import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AggregateRoot, BaseDomainEvent, Entity, ValueObject } from '../ddd-base'

// テスト用のEntity実装クラス
class TestEntity extends Entity<{ name: string; value: number }> {
  get name(): string {
    return this.props.name
  }

  get value(): number {
    return this.props.value
  }

  static create(name: string, value: number): TestEntity {
    return new TestEntity({ name, value })
  }

  static fromPersistence(props: { id: string; name: string; value: number }): TestEntity {
    return new TestEntity(props, true)
  }

  updateName(newName: string): void {
    this.props.name = newName
  }
}

// テスト用のValueObject実装クラス
class TestValueObject extends ValueObject<{ key: string; count: number }> {
  get key(): string {
    return this.props.key
  }

  get count(): number {
    return this.props.count
  }

  static create(key: string, count: number): TestValueObject {
    return new TestValueObject({ key, count })
  }
}

// テスト用のDomainEvent実装クラス
class TestDomainEvent extends BaseDomainEvent {
  constructor(
    public readonly entityId: string,
    public readonly data: string
  ) {
    super('TestEvent')
  }
}

// テスト用のAggregateRoot実装クラス
class TestAggregate extends AggregateRoot<{ name: string; active: boolean }> {
  get name(): string {
    return this.props.name
  }

  get active(): boolean {
    return this.props.active
  }

  static create(name: string, active = true): TestAggregate {
    const aggregate = new TestAggregate({ name, active })
    aggregate.addDomainEvent(new TestDomainEvent(aggregate.id, 'Created'))
    return aggregate
  }

  deactivate(): void {
    this.props.active = false
    this.addDomainEvent(new TestDomainEvent(this.id, 'Deactivated'))
  }

  activate(): void {
    this.props.active = true
    this.addDomainEvent(new TestDomainEvent(this.id, 'Activated'))
  }
}

describe('DDD基盤クラス', () => {
  describe('Entity', () => {
    it('IDが自動生成される', () => {
      const entity = TestEntity.create('テスト', 123)
      expect(entity.id).toBeTruthy()
      expect(typeof entity.id).toBe('string')
    })

    it('指定したIDでEntityを作成できる', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000'
      const entity = new TestEntity({ id, name: 'テスト', value: 123 })
      expect(entity.id).toBe(id)
    })

    it('プロパティが正しく設定される', () => {
      const entity = TestEntity.create('テスト', 123)
      expect(entity.name).toBe('テスト')
      expect(entity.value).toBe(123)
    })

    it('プロパティを更新できる', () => {
      const entity = TestEntity.create('テスト', 123)
      entity.updateName('更新後')
      expect(entity.name).toBe('更新後')
    })

    it('等価性比較ができる', () => {
      const entity1 = TestEntity.create('テスト', 123)
      const entity2 = new TestEntity({ id: entity1.id, name: 'テスト', value: 123 })
      const entity3 = TestEntity.create('テスト', 123)

      expect(entity1.equals(entity2)).toBe(true)
      expect(entity1.equals(entity3)).toBe(false)
    })

    it('永続化状態を取得できる', () => {
      const entity = TestEntity.create('テスト', 123)
      expect(entity.isPersisted()).toBe(false)

      const persistedEntity = TestEntity.fromPersistence({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'テスト',
        value: 123,
      })
      expect(persistedEntity.isPersisted()).toBe(true)
    })

    it('異なる型のEntityとの比較で常にfalseを返す', () => {
      const entity = TestEntity.create('テスト', 123)
      const vo = TestValueObject.create('キー', 10)

      // @ts-expect-error 型が異なるので比較は失敗する
      expect(entity.equals(vo)).toBe(false)
      // @ts-expect-error 型が異なるので比較は失敗する
      expect(entity.equals({})).toBe(false)
      // @ts-expect-error 型が異なるので比較は失敗する
      expect(entity.equals(null)).toBe(false)
    })
  })

  describe('ValueObject', () => {
    it('プロパティが正しく設定される', () => {
      const vo = TestValueObject.create('キー', 10)
      expect(vo.key).toBe('キー')
      expect(vo.count).toBe(10)
    })

    it('等価性比較ができる', () => {
      const vo1 = TestValueObject.create('キー', 10)
      const vo2 = TestValueObject.create('キー', 10)
      const vo3 = TestValueObject.create('別のキー', 10)

      expect(vo1.equals(vo2)).toBe(true)
      expect(vo1.equals(vo3)).toBe(false)
    })

    it('プロパティがイミュータブル（凍結）される', () => {
      const vo = TestValueObject.create('キー', 10)
      // @ts-expect-error privateプロパティにアクセス
      expect(Object.isFrozen(vo.props)).toBe(true)
    })

    it('異なる型のValueObjectとの比較で常にfalseを返す', () => {
      const vo = TestValueObject.create('キー', 10)
      const entity = TestEntity.create('テスト', 123)

      // @ts-expect-error 型が異なるので比較は失敗する
      expect(vo.equals(entity)).toBe(false)
      // @ts-expect-error 型が異なるので比較は失敗する
      expect(vo.equals({})).toBe(false)
      // @ts-expect-error 型が異なるので比較は失敗する
      expect(vo.equals(null)).toBe(false)
    })
  })

  describe('AggregateRoot', () => {
    it('Entityの機能を継承している', () => {
      const aggregate = TestAggregate.create('テスト集約')
      expect(aggregate.id).toBeTruthy()
      expect(aggregate.name).toBe('テスト集約')
      expect(aggregate.active).toBe(true)
    })

    it('ドメインイベントを追加・取得できる', () => {
      const aggregate = TestAggregate.create('テスト集約')
      const events = aggregate.domainEvents

      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(TestDomainEvent)
      expect((events[0] as TestDomainEvent).data).toBe('Created')
    })

    it('ドメインイベントをクリアできる', () => {
      const aggregate = TestAggregate.create('テスト集約')
      expect(aggregate.domainEvents).toHaveLength(1)

      aggregate.clearDomainEvents()
      expect(aggregate.domainEvents).toHaveLength(0)
    })

    it('複数のドメインイベントを追加できる', () => {
      const aggregate = TestAggregate.create('テスト集約')
      aggregate.clearDomainEvents() // 初期イベントをクリア

      aggregate.deactivate() // Deactivatedイベント追加
      aggregate.activate() // Activatedイベント追加

      const events = aggregate.domainEvents
      expect(events).toHaveLength(2)
      expect((events[0] as TestDomainEvent).data).toBe('Deactivated')
      expect((events[1] as TestDomainEvent).data).toBe('Activated')
    })
  })

  describe('BaseDomainEvent', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('イベントの基本プロパティが設定される', () => {
      const event = new TestDomainEvent('entity-123', 'テストデータ')

      expect(event.eventType).toBe('TestEvent')
      expect(event.entityId).toBe('entity-123')
      expect(event.data).toBe('テストデータ')
      expect(event.occurredOn).toBeInstanceOf(Date)
      expect(event.occurredOn).toEqual(new Date('2024-01-01T12:00:00.000Z'))
      expect(event.eventId).toBeTruthy()
      expect(typeof event.eventId).toBe('string')
    })

    it('イベントIDが自動生成される', () => {
      const event1 = new TestDomainEvent('entity-123', 'データ1')
      const event2 = new TestDomainEvent('entity-123', 'データ2')

      expect(event1.eventId).not.toBe(event2.eventId)
    })

    it('イベント発生時刻が正しく設定される', () => {
      const event = new TestDomainEvent('entity-123', 'テスト')
      expect(event.occurredOn.getTime()).toBe(new Date('2024-01-01T12:00:00.000Z').getTime())

      vi.setSystemTime(new Date('2024-01-02T12:00:00.000Z'))
      const laterEvent = new TestDomainEvent('entity-123', 'テスト')
      expect(laterEvent.occurredOn.getTime()).toBe(new Date('2024-01-02T12:00:00.000Z').getTime())
    })
  })
})
