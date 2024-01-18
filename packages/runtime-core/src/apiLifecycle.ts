import {
  type ComponentInternalInstance,
  currentInstance,
  setCurrentInstance,
} from './component'
import { LifecycleHooks } from './enums'

export const onMounted = (
  hook,
  target: ComponentInternalInstance | null = currentInstance
) => {
  if (target) {
    setCurrentInstance(target)
    const hooks = target[LifecycleHooks.MOUNTED] || []
    hooks.push(hook)
    setCurrentInstance(null)
  } else {
    console.error('声明周期函数只能在setup函数中使用')
  }
}
