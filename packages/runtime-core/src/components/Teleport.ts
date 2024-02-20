import { isString } from '@my-simplified-vue/shared'
import { RendererInternals } from '../renderer'
import { VNode } from '../vnode'

export interface TeleportProps {
  to: string | null | undefined
}

export type TeleportVNode = VNode<TeleportProps>

export const isTeleport = (type: any): boolean => type.__isTeleport

export const Teleport = {
  name: 'Teleport',
  __isTeleport: true,
  process(
    n1: TeleportVNode | null,
    n2: TeleportVNode,
    container,
    parentComponent,
    anchor,
    internals: RendererInternals
  ) {
    const {
      mc: mountChildren,
      pc: patchChildren,
      o: { querySelector },
    } = internals
    if (n1 == null) {
      //根据to属性，获取插入的目标节点
      const targetSelector = n2.props && n2.props.to
      if (isString(targetSelector)) {
        const target = querySelector(targetSelector)
        if (target) {
          mountChildren(n2.children, target, parentComponent, anchor)
        }
      }
    } else {
      patchChildren(n1, n2, container, parentComponent, anchor)
    }
  },
}
