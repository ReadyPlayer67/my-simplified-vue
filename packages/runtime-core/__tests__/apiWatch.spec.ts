import { effect, reactive } from '@my-simplified-vue/reactivity'
import { nextTick } from '../src/scheduler'
import { vi } from 'vitest'
import { watch, watchEffect } from '../src/apiWatch'

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

  it('stopping the watcher (effect)', async () => {
    const state = reactive({ count: 0 })
    let dummy
    const stop: any = watchEffect(() => {
      dummy = state.count
    })
    expect(dummy).toBe(0)
    stop()
    state.count++
    await nextTick()
    expect(dummy).toBe(0)
  })

  it('cleanup registration (effetc)', async () => {
    const state = reactive({ count: 0 })
    const cleanup = vi.fn()
    let dummy
    const stop: any = watchEffect((onCleanup) => {
      onCleanup(cleanup)
      dummy = state.count
    })
    expect(dummy).toBe(0)
    state.count++
    await nextTick()
    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(dummy).toBe(1)
    stop()
    expect(cleanup).toHaveBeenCalledTimes(2)
  })

  it('watch', () => {
    const state = reactive({ count: 0 })
    let dummy = 0
    watch(state, () => {
      dummy = state.count
    })
    //懒执行，所以一开始是0
    expect(dummy).toBe(0)
    state.count++
    expect(dummy).toBe(1)
  })

  it('watch oldValue and newValue', () => {
    const state = reactive({ count: 0 })
    let dummy: any[] = []
    watch(() => state.count, (newValue, oldValue) => {
      dummy = [newValue, oldValue]
    })
    state.count++
    expect(dummy).toMatchObject([1, 0])
  })
})