import { baseParse } from '../src/parse'
import { transform } from '../src/transform'
import { Node, NodeTypes } from '../src/ast'

describe('transform', function () {
  it('happy path', function () {
    const ast = baseParse('<div>hi,{{message}}</div>')
    const plugin = (node: Node) => {
      if (node.type === NodeTypes.TEXT) {
        node.content += 'mini-vue'
      }
    }
    transform(ast, {
      nodeTransforms: [plugin],
    })
    const textNode = ast.children![0].children![0]
    expect(textNode.content).toBe('hi,mini-vue')
  })
})
