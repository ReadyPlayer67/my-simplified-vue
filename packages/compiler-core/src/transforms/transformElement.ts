import {createVNodeCall, NodeTypes} from "../ast";

export function transformElement(node, context) {
    if (node.type === NodeTypes.ELEMENT) {
        return () => {
            //tag
            const vnodeTag = `'${node.tag}'`
            //props
            let vnodeProps
            //children
            const vnodeChildren = node.children[0]
            node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren)
        }
    }
}