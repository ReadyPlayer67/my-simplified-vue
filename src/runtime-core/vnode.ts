import {ShapeFlags} from "../shared/ShapeFlags";

//使用Symbol创建一个全局变量作为Fragment类型vnode的type
export const Fragment = Symbol('Fragment')
export const Text = Symbol('Text')

export function createVNode(type, props?, children?) {
    const vnode = {
        type,
        props,
        children,
        key:props && props.key,
        shapeFlag:getShapeFlag(type),
        el:null
    }
    if(typeof children === 'string'){
        //vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.TEXT_CHILDREN 可以简写为
        vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
    }else if(Array.isArray(children)){
        vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
    }
    //如果vnode是组件类型且children是object，我们才认为他有插槽
    if(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT){
        if(typeof vnode.children === 'object'){
            vnode.shapeFlag |= ShapeFlags.SLOT_CHILDREN
        }
    }
    return vnode
}

export function createTextVNode(text:string){
    return createVNode(Text,{}, text)
}

function getShapeFlag(type){
    ////如果vnode的type是字符串，他就是element类型，否则就是component
    if(typeof type === 'string'){
        return ShapeFlags.ELEMENT
    }else{
        return ShapeFlags.STATEFUL_COMPONENT
    }
}
