export function createVNode(type, props?, children?) {
    const vNode = {
        type,
        props,
        children
    }
    return vNode
}
