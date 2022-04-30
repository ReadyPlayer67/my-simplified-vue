import {PublicInstanceProxyHandlers} from "./componentPublicInstance";
import {initProps} from "./componentProps";
import {shallowReadonly} from "../reactivity/reactive";
import {emit} from "./componentEmit";
import {initSlots} from "./componentSlots";
import {proxyRefs} from "../reactivity";

export function createComponentInstance(vnode,parent) {
    const instance = {
        vnode,
        type:vnode.type,
        props:{},
        slots:{},
        setupState:{},
        emit:() => {},
        //将parent.provides赋值给当前instance的provides实现跨组件传值
        provides:parent ? parent.provides : {},
        parent
    }
    //这里使用了bind的偏函数功能，会给instance.emit添加一个新的参数instance并放在第一位
    //https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/bind#%E7%A4%BA%E4%BE%8B
    instance.emit = emit.bind(null,instance) as any
    return instance
}

export function setupComponent(instance) {
    //把vnode上的props挂载到组件instance上
    initProps(instance,instance.vnode.props)
    initSlots(instance,instance.vnode.children)
    //初始化有状态的组件，与此相对的还有一个纯函数组件，是没有状态的
    setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
    //调用setup()，拿到返回值
    //通过instance.vnode.type拿到组件options，在从中拿到setup
    const Component = instance.type
    //通过实现一个代理对象，并把这个代理对象挂载到render方法上，这样render方法里就可以通过this.key拿到setupState中的key属性的值
    instance.proxy = new Proxy({_:instance},PublicInstanceProxyHandlers)
    const {setup} = Component
    if (setup) {
        setCurrentInstance(instance)
        const setupResult = setup(shallowReadonly(instance.props),{
            emit:instance.emit
        })
        setCurrentInstance(null)
        handleSetupResult(instance, setupResult)
    }
    finishComponentSetup(instance)
}

function handleSetupResult(instance, setupResult) {
    //TODO function
    //setupResult有可能是function或者object
    //如果是function就认为是render函数，如果是object就注入到组件上下文中
    if (typeof setupResult === 'object') {
        instance.setupState = proxyRefs(setupResult)
    }
}

function finishComponentSetup(instance){
    const Component = instance.type
    //给instance设置render，这里假设用户写的组件一定有render方法
    instance.render = Component.render
}

let currentInstance = null
export function getCurrentInstance(){
    return currentInstance
}

function setCurrentInstance(instance){
    currentInstance = instance
}
