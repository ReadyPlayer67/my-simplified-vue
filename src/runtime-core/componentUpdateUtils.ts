//实现一个方法对比新老vnode的props，如果返回true代表变化了，要更新组件
export function shouldUpdateComponent(preVNode, nextVNode) {
    const {props: preProps} = preVNode
    const {props: nextProps} = nextVNode
    for (const key in nextProps) {
        if(preProps[key] !== nextProps[key]){
            return true
        }
    }
    return false
}