import { baseParse } from '../src/parse'
import { TransformContext, transform } from '../src/transform'
import { Node, NodeTypes } from '../src/ast'

describe('transform', function () {
  it('happy path', function () {
    const ast = baseParse('<div>hi,{{message}}</div>')
    const plugin = (node: Node, context: TransformContext) => {
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

  it('test replaceNode', function () {
    const ast = baseParse('<div><span>111</span></div>')
    const plugin = (node: Node, context: TransformContext) => {
      if (node.type === NodeTypes.ELEMENT && node.tag === 'span') {
        context.replaceNode({
          type: NodeTypes.ELEMENT,
          tag: 'p',
          content: 'replace content',
        })
      }
    }
    transform(ast, {
      nodeTransforms: [plugin],
    })
    // console.log(ast)
    const pNode = ast.children![0].children![0]
    expect(pNode.tag).toBe('p')
    expect(pNode.content).toBe('replace content')
  })
})
