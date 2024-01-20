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
      //将当前组件实例设置为target，以便挂载生命周期函数
      const reset = setCurrentInstance(target)
      const hooks = target[lifecycle] || (target[lifecycle] = [])
      hooks.push(hook)
      //挂载完之后记得还原组件实例为之前的组件实例
      reset()
    } else {
      console.error('声明周期函数只能在setup函数中使用')
    }
  }
}

export const onMounted = createHook(LifecycleHooks.MOUNTED)
export const onUpdated = createHook(LifecycleHooks.UPDATED)
