import { reactive } from '@my-simplified-vue/reactivity'
import { nextTick } from '../src/scheduler'
import { vi } from 'vitest'
import { watchEffect } from '../src/apiWatch'

describe('api: watch', () => {
  it('effect', async () => {
    const state = reactive({ count: 0 })
    let dummy
    watchEffect(() => {
      dummy = state.count
    })
    expect(dummy).toBe(0)
    state.count++
    await nextTick()
    expect(dummy).toBe(1)
  })

})