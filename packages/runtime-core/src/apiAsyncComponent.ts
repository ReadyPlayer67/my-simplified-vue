import { ref } from '@my-simplified-vue/reactivity'
import { Text, createTextVNode, createVNode } from './vnode'
import { currentInstance } from './component'
import { isFunction } from '@my-simplified-vue/shared'

export interface AsyncComponentOptions<T = any> {
  loader: AsyncComponentLoader
  loadingComponent?: any
  // loadingComponent?: Component
}

export type AsyncComponentLoader = () => Promise<any>
export function defineAsyncComponent(
  source: AsyncComponentOptions | AsyncComponentLoader
) {
  if (isFunction(source)) {
    source = { loader: source }
  }
  const { loader, loadingComponent } = source
  let resolvedComp
  return {
    name: 'AsyncComponentWrapper',
    setup() {
      const loaded = ref(false)
      const instance = currentInstance
      loader().then((comp) => {
        //如果是用import()方法导入的异步组件，得到的comp是一个模块，真实组件实例在模块的default属性上
        if(comp[Symbol.toStringTag] === 'Module'){
          comp = comp.default
        }
        resolvedComp = comp
        loaded.value = true
      })
      return () => {
        if (loaded.value) {
          return createInnerComp(resolvedComp, instance)
        } else if (loadingComponent) {
          return createVNode(loadingComponent)
        }
      }
    },
  }
}

function createInnerComp(comp, parent) {
  const { props, children } = parent.vnode
  const vnode = createVNode(comp, props, children)
  return vnode
}
