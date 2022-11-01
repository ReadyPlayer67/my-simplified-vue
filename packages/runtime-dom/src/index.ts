import {createRenderer} from "@my-simplified-vue/runtime-core";

function createElement(type){
    // console.log('createEl------------')
    return document.createElement(type)
}

function patchProp(el,key,preVal,nextVal){
    //如果是on开头的，就绑定事件
    const isOn = (key: string) => /^on[A-Z]/.test(key)
    if (isOn(key)) {
        el.addEventListener(key.slice(2).toLowerCase(), nextVal)
    }
    //否则就是普通的设置attribute
    if(nextVal === undefined || nextVal === null){
        el.removeAttribute(key)
    }else{
        el.setAttribute(key, nextVal)
    }
}

function insert(el, parent, anchor) {
    // console.log('insert------------')
    parent.insertBefore(el, anchor || null)
}

function remove(children){
    const parent = children.parentNode
    if(parent){
        parent.removeChild(children)
    }
}

function setElementText(el,children){
    el.textContent = children
}

//下面两种写法等价
// export const {createApp} = createRenderer({createElement,patchProp,insert})
const renderer:any = createRenderer({createElement,patchProp,insert,remove,setElementText})
export function createApp(...args){
    return renderer.createApp(...args)
}

//runtime-core是runtime-dom依赖的上层，所以放在这里导出
export * from '@my-simplified-vue/runtime-core'
