import { Node, NodeTypes } from './ast'
import {
  CREATE_ELEMENT_VNODE,
  helperNameMap,
  TO_DISPLAY_STRING,
} from './runtimeHelpers'
import { isString } from '@my-simplified-vue/shared'

export interface CodegenContext {
  code: string
  helper(key: symbol): string
  push(code: string, node?: Node): void
}
export function generate(ast: Node) {
  const context = createCodegenContext()
  const { push } = context
  genFunctionPreamble(ast, context)
  const functionName = 'render'
  const args = ['_ctx', '_cache']
  const signature = args.join(', ')
  push(`function ${functionName} (${signature}) {`)
  push('return ')
  if (ast.codegenNode) {
    genNode(ast.codegenNode, context)
  } else {
    push(`null`)
  }
  push('}')
  return {
    code: context.code,
  }
}

function createCodegenContext(): CodegenContext {
  const context = {
    code: '',
    push(source) {
      context.code += source
    },
    helper(key) {
      return `_${helperNameMap[key]}`
    },
  }
  return context
}

//处理前导码（import，const）这些
function genFunctionPreamble(ast: Node, context: CodegenContext) {
  const { push } = context
  const VueBinging = 'Vue'
  const aliasHelper = (s) => `${helperNameMap[s]}: _${helperNameMap[s]}`
  const helpers = Array.from(ast.helpers!)
  if (helpers.length > 0) {
    push(
      `const { ${helpers
        .map((helper) => aliasHelper(helper))
        .join(', ')} } = ${VueBinging}`
    )
  }
  push('\n')
  push('return ')
}

function genNode(node: Node, context: CodegenContext) {
  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context)
      break
    case NodeTypes.TEXT:
      genText(node, context)
      break
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context)
      break
    case NodeTypes.ELEMENT:
      genElement(node, context)
      break
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context)
      break
    default:
      break
  }
}

function genText(node: Node, context: CodegenContext) {
  const { push } = context
  push(`'${node.content}'`)
}

function genInterpolation(node: Node, context: CodegenContext) {
  const { push, helper } = context
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content as Node, context)
  push(')')
}

function genExpression(node: Node, context: CodegenContext) {
  const { push } = context
  push(`${node.content}`)
}

function genElement(node: Node, context: CodegenContext) {
  const { push, helper } = context
  const { tag, children, props } = node
  push(`${helper(CREATE_ELEMENT_VNODE)}(`)
  genNodeList(genNullable([tag, props, children]), context)
  push(')')
}

function genNullable(args) {
  return args.map((arg) => arg || 'null')
}

function genNodeList(nodes: Node[], context: CodegenContext) {
  const { push } = context
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (isString(node)) {
      push(node)
    } else {
      genNode(node, context)
    }
    if (i < nodes.length - 1) {
      push(', ')
    }
  }
}

function genCompoundExpression(node: Node, context: CodegenContext) {
  const { push } = context
  const children = node.children!
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (isString(child)) {
      //符号+直接push
      push(child)
    } else {
      //文字类型节点
      genNode(child, context)
    }
  }
}
