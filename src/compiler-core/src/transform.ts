export function transform(root, options = {}) {
    //创建一个上下文存放root和options
    const context = createTransformContext(root, options)
    traverseNode(root, context)
    //创建一个codegenNode作为生成render函数的入口节点
    createCodegenNode(root)
}

function createCodegenNode(root){
    root.codegenNode = root.children[0]
}

function createTransformContext(root, options) {
    return {
        root,
        nodeTransforms: options.nodeTransforms || []
    }
}

//利用递归对ast树进行深度优先遍历
function traverseNode(node, context) {
    const {nodeTransforms} = context
    //通过插件机制将容易变动的代码抽离出去，由外部去实现
    //这样程序的扩展性就变得很强了，并且提高了程序的可测试性
    for (const transform of nodeTransforms) {
        transform(node)
    }
    traverseChildren(node, context)
}

function traverseChildren(node, context) {
    const children = node.children
    if (children) {
        for (let i = 0; i < children.length; i++) {
            traverseNode(children[i], context)
        }
    }
}
