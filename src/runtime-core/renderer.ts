import {createComponentInstance, setupComponent} from "./component";
import {isObject} from "../shared";

export function render(vnode, container) {

    patch(vnode, container)
}

function patch(vnode, container) {
    //如果vnode的type是字符串，他就是element类型
    if (typeof vnode.type === 'string') {
        processElement(vnode, container)
    } else if (isObject(vnode.type)) {//如果vnode的type是object，就是component类型
        processComponent(vnode, container)
    }
}

//处理element类型的vnode
function processElement(vnode, container) {
    mountElement(vnode,container)
}

function mountElement(vnode, container) {
    const {type,props,children} = vnode
    //使用连续赋值，把el赋值给vnode.el
    //但是这里的vnode是element类型的（div），组件的vnode上是没有值的，所以要在下面赋值给组件的el
    const el = vnode.el = document.createElement(type) //type就是element的类型(div,p,h1...)
    for (const key in props) {
        el.setAttribute(key,props[key])
    }
    if(typeof children === 'string'){
        //如果children是字符串，就直接显示
        el.textContent = children
    }else if(Array.isArray(children)){
        //如果children是数组，说明是子元素，继续调用patch渲染
        mountChildren(vnode,el)
    }
    //把element append到页面上
    container.append(el)
}

function mountChildren(vnode,container){
    vnode.children.forEach(vnode => {
        patch(vnode,container)
    })
}

//处理组件类型的vnode
function processComponent(vnode, container) {
    //挂载虚拟节点
    mountComponent(vnode, container)
}

function mountComponent(initialVnode, container) {
    //创建一个组件实例
    const instance = createComponentInstance(initialVnode)
    //初始化组件
    setupComponent(instance)
    //执行render方法
    setupRenderEffect(instance, container)
}

function setupRenderEffect(instance, container) {
    //把proxy对象挂载到render方法上（通过call指定render方法里this的值）
    const {proxy} = instance
    const subTree = instance.render.call(proxy)
    //vnode->element->mountElement
    //拿到组件的子组件，再交给patch方法处理
    patch(subTree, container)
    //所有的element都已经mount了，也就是说组件被全部转换为了element组成的虚拟节点树结构
    //这时候subTree的el就是这个组件根节点的el，赋值给组件的el属性即可
    instance.vnode.el = subTree.el
}
