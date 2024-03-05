import { Node, NodeTypes } from './ast'
import { TransformOptions } from './option'
import { TO_DISPLAY_STRING } from './runtimeHelpers'

export interface TransformContext {
  root: Node
  currentNode: Node | null
  parent: Node | null
  childIndex: number
  helpers: Map<symbol, number>
  helper(key: symbol): symbol
  nodeTransforms: NodeTransform[]
  replaceNode(node: Node): void
  removeNode(node?: Node): void
}

//插件函数可能没用返回值，也有可能返回一个函数，用于控制多个插件的执行顺序
export type NodeTransform = (
  node: Node,
  context: TransformContext
) => void | (() => void)

export function transform(root: Node, options: TransformOptions) {
  //创建一个上下文存放root和options
  const context = createTransformContext(root, options)
  traverseNode(root, context)
  //创建一个codegenNode作为生成render函数的入口节点
  createCodegenNode(root)
  root.helpers = new Set([...context.helpers.keys()])
}

function createCodegenNode(root: Node) {
  //获取root下的第一个节点，如果是element类型，就把element的codegenNode作为root的入口
  const child = root.children![0]
  if (child.type === NodeTypes.ELEMENT) {
    root.codegenNode = child.codegenNode
  } else {
    root.codegenNode = root.children![0]
  }
}

function createTransformContext(
  root: Node,
  options: TransformOptions
): TransformContext {
  const context: TransformContext = {
    root,
    currentNode: root,
    parent: null,
    childIndex: 0,
    //helpers用来存放需要导入的依赖名称
    helpers: new Map<symbol, number>(),
    helper(key: symbol) {
      context.helpers.set(key, 1)
      return key
    },
    nodeTransforms: options.nodeTransforms || [],
    replaceNode(node) {
      //先找到要被替换的节点，再将context.currentNode也替换为node
      context.parent!.children![context.childIndex] = context.currentNode = node
    },
    removeNode(node) {
      context.parent!.children!.splice(context.childIndex, 1)
      context.currentNode = null
    },
  }
  return context
}

//利用递归对ast树进行深度优先遍历
function traverseNode(node: Node, context: TransformContext) {
  context.currentNode = node
  const { nodeTransforms } = context
  let exitFns: (() => void)[] = []
  //通过插件机制将容易变动的代码抽离出去，由外部去实现
  //这样程序的扩展性就变得很强了，并且提高了程序的可测试性
  for (const transform of nodeTransforms) {
    const onExit = transform(node, context)
    if (onExit) exitFns.push(onExit)
  }
  //根据节点类型给ast添加需要导入的模块helpers
  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING)
      break
    //root和element类型节点才会有children
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      traverseChildren(node, context)
      break
    default:
      break
  }
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}

function traverseChildren(node: Node, context: TransformContext) {
  const children = node.children!
  for (let i = 0; i < children.length; i++) {
    context.parent = context.currentNode
    context.childIndex = i
    traverseNode(children[i], context)
  }
}
