import {
  ShapeFlags,
  isArray,
  isFunction,
  isObject,
} from '@my-simplified-vue/shared'
import { ComponentOptions } from './component'

//使用Symbol创建一个全局变量作为Fragment类型vnode的type
export const Fragment = Symbol('Fragment')
export const Text = Symbol('Text')

export { createVNode as createElementVNode }

export interface VNode {
  type: string | typeof Fragment | typeof Text | ComponentOptions
  props: Record<string, unknown> | null
  key: string | number | symbol | null
  children: string | null | VNode[]
  component: any
  shapeFlag: number
  el: Record<string, any> | null
}

export function createVNode(type, props?, children?) {
  const vnode: VNode = {
    type,
    props,
    children,
    component: null,
    key: props && props.key,
    shapeFlag: getShapeFlag(type),
    el: null,
  }
  if (typeof children === 'string') {
    //vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.TEXT_CHILDREN 可以简写为
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  } else if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  } else if(isFunction(type)){
    vnode.shapeFlag |= ShapeFlags.FUNCTIONAL_COMPONENT
  }
  //如果vnode是组件类型且children是object，我们才认为他有插槽
  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    if (typeof vnode.children === 'object') {
      vnode.shapeFlag |= ShapeFlags.SLOT_CHILDREN
    }
  }
  return vnode
}

export function createTextVNode(text: string) {
  return createVNode(Text, {}, text)
}

function getShapeFlag(type) {
  ////如果vnode的type是字符串，他就是element类型，否则就是component
  if (typeof type === 'string') {
    return ShapeFlags.ELEMENT
  } else if (isObject(type)) {
    return ShapeFlags.STATEFUL_COMPONENT
  } else if (isFunction(type)) {
    return ShapeFlags.FUNCTIONAL_COMPONENT
  } else {
    return 0
  }
}
//构建VNode的方法，比如节点是一段文本，包裹为Text类型的节点
export function normalizeVNode(child): VNode {
  if (isArray(child)) {
    // fragment
    return createVNode(Fragment, null, child.slice())
  } else if (typeof child === 'object') {
    return child
  } else {
    return createVNode(Text, null, String(child))
  }
}

export function isSameVNodeType(n1: VNode, n2: VNode) {
  return n1.type === n2.type && n1.key === n2.key
}
