import { CREATE_ELEMENT_VNODE } from './runtimeHelpers'
import { TransformContext } from './transform'

export const enum NodeTypes {
  INTERPOLATION,
  SIMPLE_EXPRESSION,
  ELEMENT,
  TEXT,
  ROOT,
  COMPOUND_EXPRESSION,
  ATTRIBUTE,
}

export interface Node {
  type: NodeTypes
  source?: string
  children?: Node[]
  helpers?: Set<symbol>
  content?: string | Node
  tag?: string
  codegenNode?: Node
  props?: any
  isSelfClosing?: boolean
}

export interface AttributeNode extends Node {
  type: NodeTypes.ATTRIBUTE
  name: string
  value: string
}

export function createVNodeCall(context: TransformContext, tag, props, children) {
  context.helper(CREATE_ELEMENT_VNODE)
  return {
    type: NodeTypes.ELEMENT,
    tag,
    props,
    children,
  }
}
