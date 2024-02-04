import { ShapeFlags } from '@my-simplified-vue/shared'
import { VNode } from '../vnode'
import { getCurrentInstance } from '../component'

export interface KeepAliveContext {
  renderer: any
  activate: (vnode: VNode, container: any, anchor: any) => void
  deactivate: (vnode: VNode) => void
}

//判断一个组件是否是KeepAlive组件
export const isKeepAlive = (vnode: VNode): boolean =>
  (vnode.type as any).__isKeepAlive

export const KeepAlive = {
  __isKeepAlive: true,
  setup(props, { slots }) {
    const instance = getCurrentInstance()!
    const sharedContext = instance.ctx as unknown as KeepAliveContext
    //创建一个Map用来缓存组件
    const cache = new Map()
    const {
      renderer: {
        m: move,
        o: { createElement },
      },
    } = sharedContext
    const storageContainer = createElement('div')

    sharedContext.activate = (vnode, container, anchor) => {
      move(vnode, container, anchor)
    }

    sharedContext.deactivate = (vnode: VNode) => {
      move(vnode, storageContainer, null)
    }

    return () => {
      const children = slots.default()
      const rawVNode: VNode = children[0]
      if (children.length > 1) {
        console.warn('KeepAlive 只能有一个子节点')
        return children
      } else if (!(rawVNode.shapeFlag & ShapeFlags.COMPONENT)) {
        //如果子节点不是组件，无法缓存，直接渲染
        return rawVNode
      }
      const key = rawVNode.key == null ? rawVNode.type : rawVNode.key
      const cachedVNode = cache.get(key)
      if (cachedVNode) {
        rawVNode.el = cachedVNode.el
        rawVNode.component = cachedVNode.component
        rawVNode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
      } else {
        cache.set(key, rawVNode)
      }
      rawVNode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
      return rawVNode
    }
  },
}
