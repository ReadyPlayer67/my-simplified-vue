//先写一个单元测试测试创建reactive
import { isProxy, isReactive, reactive } from '../src/reactive'
import { vi, describe, expect, it } from 'vitest'

describe('reactive', () => {
  it('happy path', function () {
    const original = { foo: 1 }
    const observed = reactive(original)
    expect(observed).not.toBe(original)
    expect(observed.foo).toBe(1)
    expect(isReactive(observed)).toBe(true)
    expect(isReactive(original)).toBe(false)
    expect(isProxy(observed)).toBe(true)
  })

  it('nested reactive', function () {
    const original = {
      nested: { foo: 1 },
      arr: [{ bar: 2 }],
    }
    const observed = reactive(original)
    expect(isReactive(observed.nested)).toBe(true)
    expect(isReactive(observed.arr[0])).toBe(true)
  })

  it('observing already observed value should return same Proxy', () => {
    const original = { foo: 1 }
    const observed = reactive(original)
    const observed2 = reactive(observed)
    expect(observed2).toBe(observed)
  })
})
