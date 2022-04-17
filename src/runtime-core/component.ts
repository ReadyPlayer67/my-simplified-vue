export function createComponentInstance(vnode) {
    const instance = {
        vnode,
        type:vnode.type
    }
    return instance
}

export function setupComponent(instance) {
    //TODO
    //initProps
    //initSlots

    //初始化有状态的组件，与此相对的还有一个纯函数组件，是没有状态的
    setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
    //调用setup()，拿到返回值
    //通过instance.vnode.type拿到组件options，在从中拿到setup
    const Component = instance.type
    const {setup} = Component
    if (setup) {
        const setupResult = setup()
        handleSetupResult(instance, setupResult)
    }
    finishComponentSetup(instance)
}

function handleSetupResult(instance, setupResult) {
    //TODO function
    //setupResult有可能是function或者object
    //如果是function就认为是render函数，如果是object就注入到组件上下文中
    if (typeof setupResult === 'object') {
        instance.setupState = setupResult
    }
}

function finishComponentSetup(instance){
    const Component = instance.type
    //给instance设置render，这里假设用户写的组件一定有render方法
    instance.render = Component.render
}
