'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        el: null
    };
    return vnode;
}

//用一个map实现策略模式，省略一堆if else
const publicPropertiesMap = {
    $el: (i) => i.vnode.el
};
const PublicInstanceProxyHandlers = {
    //通过给target对象新增一个_属性来实现传值
    get({ _: instance }, key) {
        const { setupState } = instance;
        if (key in setupState) {
            return setupState[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    }
};

function createComponentInstance(vnode) {
    const instance = {
        vnode,
        type: vnode.type,
        setupState: {}
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
    //通过实现一个代理对象，并把这个代理对象挂载到render方法上，这样render方法里就可以通过this.key拿到setupState中的key属性的值
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
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
    //使用连续赋值，把el赋值给vnode.el
    //但是这里的vnode是element类型的（div），组件的vnode上是没有值的，所以要在下面赋值给组件的el
    const el = vnode.el = document.createElement(type); //type就是element的类型(div,p,h1...)
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
function mountComponent(initialVnode, container) {
    //创建一个组件实例
    const instance = createComponentInstance(initialVnode);
    //初始化组件
    setupComponent(instance);
    //执行render方法
    setupRenderEffect(instance, container);
}
function setupRenderEffect(instance, container) {
    //把proxy对象挂载到render方法上（通过call指定render方法里this的值）
    const { proxy } = instance;
    const subTree = instance.render.call(proxy);
    //vnode->element->mountElement
    //拿到组件的子组件，再交给patch方法处理
    patch(subTree, container);
    //所有的element都已经mount了，也就是说组件被全部转换为了element组成的虚拟节点树结构
    //这时候subTree的el就是这个组件根节点的el，赋值给组件的el属性即可
    instance.vnode.el = subTree.el;
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

exports.createApp = createApp;
exports.h = h;
