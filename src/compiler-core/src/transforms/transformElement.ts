import {NodeTypes} from "../ast";
import {CREATE_ELEMENT_VNODE} from "../runtimeHelpers";

export function transformElement(node, context) {
    if (node.type === NodeTypes.ELEMENT) {
        return () => {
            context.helper(CREATE_ELEMENT_VNODE)
            //tag
            const vnodeTag = node.tag
            //props
            let vnodeProps
            //children
            const vnodeChildren = node.children[0]
            const vnodeElement = {
                type:NodeTypes.ELEMENT,
                tag:vnodeTag,
                props:vnodeProps,
                children:vnodeChildren
            }
            node.codegenNode = vnodeElement
        }
    }
}