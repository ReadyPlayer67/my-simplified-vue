import {
  type ComponentInternalInstance,
  currentInstance,
  setCurrentInstance,
} from './component'
import { LifecycleHooks } from './enums'

const createHook = (lifecycle: LifecycleHooks) => {
  return (
    hook: Function,
    target: ComponentInternalInstance | null = currentInstance
  ) => {
    if (target) {
      const reset = setCurrentInstance(target)
      const hooks = target[lifecycle] || (target[lifecycle] = [])
      hooks.push(hook)
      reset()
    } else {
      console.error('声明周期函数只能在setup函数中使用')
    }
  }
}

export const onMounted = createHook(LifecycleHooks.MOUNTED)
export const onUpdated = createHook(LifecycleHooks.UPDATED)
