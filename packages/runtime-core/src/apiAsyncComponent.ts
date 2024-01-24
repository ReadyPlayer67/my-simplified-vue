import { ref } from '@my-simplified-vue/reactivity'
import { Text, createTextVNode, createVNode } from './vnode'
import { currentInstance } from './component'

export function defineAsyncComponent(loader: () => Promise<any>) {
  let resolvedComp
  return {
    name: 'AsyncComponentWrapper',
    setup() {
      const loaded = ref(false)
      const instance = currentInstance
      loader().then((comp) => {
        resolvedComp = comp
        loaded.value = true
      })
      return () => {
        return loaded.value
          ? createInnerComp(resolvedComp, instance)
          : createVNode('div', {}, 'Loading...')
      }
    },
  }
}

function createInnerComp(comp, parent) {
  const { props, children } = parent.vnode
  const vnode = createVNode(comp, props, children)
  return vnode
}
