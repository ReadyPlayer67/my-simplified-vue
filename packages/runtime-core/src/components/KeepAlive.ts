import { ShapeFlags } from "@my-simplified-vue/shared"
import { VNode } from "../vnode"

//判断一个组件是否是KeepAlive组件
export const isKeepAlive = (vnode: VNode): boolean =>
  (vnode.type as any).__isKeepAlive

export const KeepAlive = {
  __isKeepAlive: true,
  setup(props, { slots }) {

    return () => {
      const children = slots.default()
      const rawVNode = children[0]
      if(children.length > 1){
        console.warn('KeepAlive 只能有一个子节点')
        return children
      }else if(!(rawVNode.shapeFlag & ShapeFlags.COMPONENT)){
        //如果子节点不是组件，无法缓存，直接渲染
        return rawVNode
      }

      return rawVNode
    }
  },
}
