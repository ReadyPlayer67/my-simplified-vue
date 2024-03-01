import { createVNodeCall, Node, NodeTypes } from '../ast'
import { NodeTransform, TransformContext } from '../transform'

export const transformElement: NodeTransform = (node, context) => {
  return () => {
    //tag
    if (node.type === NodeTypes.ELEMENT) {
      const vnodeTag = `'${node.tag}'`
      //props
      let vnodeProps
      //children
      const vnodeChildren = node.children![0]
      node.codegenNode = createVNodeCall(
        context,
        vnodeTag,
        vnodeProps,
        vnodeChildren
      )
    }
  }
}
