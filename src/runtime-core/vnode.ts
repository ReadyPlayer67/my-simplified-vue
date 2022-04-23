import {ShapeFlags} from "../shared/ShapeFlags";

export function createVNode(type, props?, children?) {
    const vnode = {
        type,
        props,
        children,
        shapeFlag:getShapeFlag(type),
        el:null
    }
    if(typeof children === 'string'){
        //vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.TEXT_CHILDREN 可以简写为
        vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
    }else if(Array.isArray(children)){
        vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
    }
    return vnode
}

function getShapeFlag(type){
    ////如果vnode的type是字符串，他就是element类型，否则就是component
    if(typeof type === 'string'){
        return ShapeFlags.ELEMENT
    }else{
        return ShapeFlags.STATEFUL_COMPONENT
    }
}