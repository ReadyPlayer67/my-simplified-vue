import {createComponentInstance, setupComponent} from "./component";

export function render(vnode, container) {

    patch(vnode, container)
}

function patch(vnode, container) {
    //判断vNode的类型
    //当虚拟节点是一个组件时
    processComponent(vnode, container)
}

function processComponent(vnode, container) {
    //挂载虚拟节点
    mountComponent(vnode, container)
}

function mountComponent(vnode, container) {
    //创建一个组件实例
    const instance = createComponentInstance(vnode)
    //初始化组件
    setupComponent(instance)
    //执行render方法
    setupRenderEffect(instance, container)
}

function setupRenderEffect(instance, container) {
    //拿到组件的子组件，再交给patch方法处理
    const subTree = instance.render()
    //得到element类型的子vNode
    //vnode->element->mountElement
    patch(subTree, container)
}
