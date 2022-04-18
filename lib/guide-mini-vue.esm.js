function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children
    };
    return vnode;
}

function createComponentInstance(vnode) {
    const instance = {
        vnode,
        type: vnode.type
    };
    return instance;
}
function setupComponent(instance) {
    //TODO
    //initProps
    //initSlots
    //初始化有状态的组件，与此相对的还有一个纯函数组件，是没有状态的
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    //调用setup()，拿到返回值
    //通过instance.vnode.type拿到组件options，在从中拿到setup
    const Component = instance.type;
    const { setup } = Component;
    if (setup) {
        const setupResult = setup();
        handleSetupResult(instance, setupResult);
    }
    finishComponentSetup(instance);
}
function handleSetupResult(instance, setupResult) {
    //TODO function
    //setupResult有可能是function或者object
    //如果是function就认为是render函数，如果是object就注入到组件上下文中
    if (typeof setupResult === 'object') {
        instance.setupState = setupResult;
    }
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    //给instance设置render，这里假设用户写的组件一定有render方法
    instance.render = Component.render;
}

const isObject = (val) => {
    return val !== null && typeof val === 'object';
};

function render(vnode, container) {
    patch(vnode, container);
}
function patch(vnode, container) {
    //如果vnode的type是字符串，他就是element类型
    if (typeof vnode.type === 'string') {
        processElement(vnode, container);
    }
    else if (isObject(vnode.type)) { //如果vnode的type是object，就是component类型
        processComponent(vnode, container);
    }
}
//处理element类型的vnode
function processElement(vnode, container) {
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    const { type, props, children } = vnode;
    const el = document.createElement(type); //type就是element的类型(div,p,h1...)
    for (const key in props) {
        el.setAttribute(key, props[key]);
    }
    if (typeof children === 'string') {
        //如果children是字符串，就直接显示
        el.textContent = children;
    }
    else if (Array.isArray(children)) {
        //如果children是数组，说明是子元素，继续调用patch渲染
        mountChildren(vnode, el);
    }
    //把element append到页面上
    container.append(el);
}
function mountChildren(vnode, container) {
    vnode.children.forEach(vnode => {
        patch(vnode, container);
    });
}
//处理组件类型的vnode
function processComponent(vnode, container) {
    //挂载虚拟节点
    mountComponent(vnode, container);
}
function mountComponent(vnode, container) {
    //创建一个组件实例
    const instance = createComponentInstance(vnode);
    //初始化组件
    setupComponent(instance);
    //执行render方法
    setupRenderEffect(instance, container);
}
function setupRenderEffect(instance, container) {
    //拿到组件的子组件，再交给patch方法处理
    const subTree = instance.render();
    console.log(subTree);
    //得到element类型的子vNode
    //vnode->element->mountElement
    patch(subTree, container);
}

//接收一个根组件
function createApp(rootComponent) {
    //返回一个对象，对象中有一个render方法
    return {
        //render方法接收一个根容器
        mount(rootContainer) {
            //先要将component转换为vnode
            //所有的逻辑都会基于vnode做处理
            const vnode = createVNode(rootComponent);
            render(vnode, rootContainer);
        }
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

export { createApp, h };
