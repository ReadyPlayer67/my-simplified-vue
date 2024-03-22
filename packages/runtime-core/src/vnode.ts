import { ShapeFlags, isArray, isFunction, isObject } from '@my-simplified-vue/shared'
import { ComponentOptions } from './component'
import { isTeleport } from './components/Teleport'
import { TransitionHooks } from './components/Transition'
import { RendererElement } from './renderer'

//使用Symbol创建一个全局变量作为Fragment类型vnode的type
export const Fragment = Symbol('Fragment')
export const Text = Symbol('Text')

export { createVNode as createElementVNode }

export interface VNode<ExtraProps = { [key: string]: any }> {
  type: string | typeof Fragment | typeof Text | ComponentOptions
  props: ExtraProps | null
  key: string | number | symbol | null
  children: string | null | VNode[]
  component: any
  shapeFlag: number
  patchFlag: number
  el: RendererElement | null
  transition?: TransitionHooks
  //如果一个节点是Block，用dynamicChildren属性存放他子代节点中动态的子节点
  dynamicChildren: VNode[] | null
}

//动态节点栈
export const blockStack: (VNode[] | null)[] = []
//当前动态节点集合
export let currentBlock: VNode[] | null = null

export function openBlock(disableTracking = false) {
  blockStack.push((currentBlock = disableTracking ? null : []))
}

export function closeBlock() {
  blockStack.pop()
  currentBlock = blockStack[blockStack.length - 1] || null
}

export function createBlock(
  type: string | typeof Fragment | typeof Text | ComponentOptions,
  props,
  children: string | null | VNode[],
  patchFlag: number = 0
) {
  // block 本质上也是一个 vnode
  const block = createVNode(type,props,children,patchFlag)
  // 将当前动态节点集合作为 block.dynamicChildren
  block.dynamicChildren = currentBlock
  closeBlock()
  return block
}

export function createVNode(
  type: string | typeof Fragment | typeof Text | ComponentOptions,
  props,
  children: string | null | VNode[],
  patchFlag: number = 0
) {
  const vnode: VNode = {
    type,
    props,
    children,
    component: null,
    key: props && props.key,
    shapeFlag: getShapeFlag(type),
    patchFlag,
    el: null,
    dynamicChildren: null,
  }
  if (typeof children === 'string') {
    //vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.TEXT_CHILDREN 可以简写为
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  } else if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  } else if (isFunction(type)) {
    vnode.shapeFlag |= ShapeFlags.FUNCTIONAL_COMPONENT
  }
  //如果vnode是组件类型且children是object，我们才认为他有插槽
  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    if (typeof vnode.children === 'object') {
      vnode.shapeFlag |= ShapeFlags.SLOT_CHILDREN
    }
  }
  //patchFlag>0表示节点是动态的，将其添加到当前动态节点集合中
  if (patchFlag > 0 && currentBlock) {
    currentBlock.push(vnode)
  }
  return vnode
}

export function createTextVNode(text: string) {
  return createVNode(Text, {}, text)
}

function getShapeFlag(type) {
  //如果vnode的type是字符串，他就是element类型，否则就是component
  if (typeof type === 'string') {
    return ShapeFlags.ELEMENT
  } else if (isTeleport(type)) {
    return ShapeFlags.TELEPORT
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
