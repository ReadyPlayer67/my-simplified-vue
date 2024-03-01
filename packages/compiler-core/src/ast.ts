import { CREATE_ELEMENT_VNODE } from './runtimeHelpers'
import { TransformContext } from './transform'

export const enum NodeTypes {
  INTERPOLATION,
  SIMPLE_EXPRESSION,
  ELEMENT,
  TEXT,
  ROOT,
  COMPOUND_EXPRESSION,
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
}

export function createVNodeCall(
  context: TransformContext,
  tag,
  props,
  children
) {
  context.helper(CREATE_ELEMENT_VNODE)
  return {
    type: NodeTypes.ELEMENT,
    tag,
    props,
    children,
  }
}
