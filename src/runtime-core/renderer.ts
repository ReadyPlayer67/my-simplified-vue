import {createComponentInstance, setupComponent} from "./component";

export function render(vNode, container) {

    patch(vNode, container)
}

function patch(vNode, container) {
    //判断vNode的类型
    //处理虚拟节点,当虚拟节点是一个组件时
    processComponent(vNode, container)
}

function processComponent(vNode, container) {
    //挂载虚拟节点
    mountComponent(vNode, container)
}

function mountComponent(vNode, container) {
    //创建一个组件实例
    const instance = createComponentInstance(vNode)
    //初始化组件
    setupComponent(instance)
    //执行render方法
    setupRenderEffect(instance, container)
}

function setupRenderEffect(instance, container) {
    //拿到组件的子组件，再交给patch方法处理
    const subTree = instance.render()
    //得到element类型的子vNode
    //vNode->element->mountElement
    patch(subTree, container)
}
