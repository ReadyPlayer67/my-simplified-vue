import { NodeTypes } from '../ast'
import { NodeTransform } from '../transform'

export const transformExpression: NodeTransform = (node) => {
  if (node.type === NodeTypes.INTERPOLATION) {
    node.content = processExpression(node.content)
  }
}

function processExpression(node) {
  node.content = '_ctx.' + node.content
  return node
}
