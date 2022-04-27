//使用Symbol创建一个全局变量作为Fragment类型vnode的type
const Fragment = Symbol('Fragment');
const Text = Symbol('Text');
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        shapeFlag: getShapeFlag(type),
        el: null
    };
    if (typeof children === 'string') {
        //vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.TEXT_CHILDREN 可以简写为
        vnode.shapeFlag |= 4 /* TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ARRAY_CHILDREN */;
    }
    //如果vnode是组件类型且children是object，我们才认为他有插槽
    if (vnode.shapeFlag & 2 /* STATEFUL_COMPONENT */) {
        if (typeof vnode.children === 'object') {
            vnode.shapeFlag |= 16 /* SLOT_CHILDREN */;
        }
    }
    return vnode;
}
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}
function getShapeFlag(type) {
    ////如果vnode的type是字符串，他就是element类型，否则就是component
    if (typeof type === 'string') {
        return 1 /* ELEMENT */;
    }
    else {
        return 2 /* STATEFUL_COMPONENT */;
    }
}

const extend = Object.assign;
const isObject = (val) => {
    return val !== null && typeof val === 'object';
};
// export const hasOwn = (obj,key) => obj.hasOwnProperty(key) 两种写法一个意思
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
//将add-foo替换为addFoo
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : '';
    });
};
//将addFoo替换为AddFoo
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
const toHandlerKey = (str) => {
    return str ? 'on' + capitalize(camelize(str)) : '';
};

//用一个map实现策略模式，省略一堆if else
const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots
};
const PublicInstanceProxyHandlers = {
    //通过给target对象新增一个_属性来实现传值
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        //hasOwn方法用来检测对象中是否包含这个key
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    }
};

const initProps = (instance, raw) => {
    //因为组件有可能没有props，比如main.js中创建App，如果没有需要给一个空对象，不然用undefined创建shallowReadonly会报错
    instance.props = raw || {};
};

let targetMap = new Map(); //每一个reactive对象里的每一个key都需要有一个dep容器存放effect，当key的value变化时触发effect，实现响应式
const trigger = (target, key) => {
    const dep = targetMap.get(target).get(key);
    triggerEffects(dep);
};
function triggerEffects(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}

//将get和set缓存下来，这样就不用每次new Proxy()的时候就调用一次createGetter和createSetter
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
//使用高阶函数的技巧，这样就可以通过传参区分isReadonly
function createGetter(isReadonly = false, shallow = false) {
    return (target, key) => {
        //通过proxy拦截的get操作，判断获取的key，如果是ReactiveFlags.IS_REACTIVE，就return isReadonly
        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly;
        }
        else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly;
        }
        const res = Reflect.get(target, key);
        //如果是shallowReadonly，就不需要做嵌套readonly转换了，直接return
        if (shallow) {
            return res;
        }
        //如果get到的也是个对象，对这个对象也实现reactive/readonly，从而实现嵌套的响应式/只读
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter() {
    return (target, key, value) => {
        //这里有个坑，要先执行反射set操作，再执行trigger，不然effect里拿到依赖的值还是原始值
        const res = Reflect.set(target, key, value);
        trigger(target, key);
        return res;
    };
}
const mutableHandler = {
    get,
    set
};
const readonlyHandler = {
    get: readonlyGet,
    //readonly对象，执行set的时候触发警告,不执行set反射操作
    set(target, key, value) {
        console.warn(`key ${key} set失败，readonly对象无法被set`);
        return true;
    }
};
const shallowReadonlyHandler = extend({}, readonlyHandler, {
    get: shallowReadonlyGet
});

var ReactiveFlags;
(function (ReactiveFlags) {
    ReactiveFlags["IS_REACTIVE"] = "__v_isReactive";
    ReactiveFlags["IS_READONLY"] = "__v_isReadonly";
})(ReactiveFlags || (ReactiveFlags = {}));
const reactive = (raw) => {
    return createActiveObject(raw, mutableHandler);
};
const readonly = (raw) => {
    return createActiveObject(raw, readonlyHandler);
};
const shallowReadonly = (raw) => {
    return createActiveObject(raw, shallowReadonlyHandler);
};
//用一个工具函数将new Proxy这样的底层代码封装起来
function createActiveObject(raw, baseHandler) {
    return new Proxy(raw, baseHandler);
}

function emit(instance, event, ...args) {
    const { props } = instance;
    const handlerName = toHandlerKey(event);
    const handler = props[handlerName];
    handler && handler(...args);
}

function initSlots(instance, children) {
    if (instance.vnode.shapeFlag & 16 /* SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const value = children[key];
        //父组件上的具名插槽是Record<string,function>
        slots[key] = (props) => {
            //value就是父组件写的函数({age}) => h('p', {}, 'header' + age)
            return normalizeSlotValue(value(props));
        };
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

function createComponentInstance(vnode) {
    const instance = {
        vnode,
        type: vnode.type,
        props: {},
        slots: {},
        setupState: {},
        emit: () => { }
    };
    //这里使用了bind的偏函数功能，会给instance.emit添加一个新的参数instance并放在第一位
    //https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/bind#%E7%A4%BA%E4%BE%8B
    instance.emit = emit.bind(null, instance);
    return instance;
}
function setupComponent(instance) {
    //把vnode上的props挂载到组件instance上
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
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
        setCurrentInstance(instance);
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit
        });
        setCurrentInstance(null);
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
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

function render(vnode, container) {
    patch(vnode, container);
}
function patch(vnode, container) {
    const { shapeFlag } = vnode;
    switch (vnode.type) {
        case Fragment:
            processFragment(vnode, container);
            break;
        case Text:
            processText(vnode, container);
            break;
        default:
            //通过位运算符判断vnode的类型
            if (shapeFlag & 1 /* ELEMENT */) {
                processElement(vnode, container);
            }
            else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                processComponent(vnode, container);
            }
            break;
    }
}
//处理Fragment类型节点
function processFragment(vnode, container) {
    mountChildren(vnode, container);
}
//处理Text类型节点
function processText(vnode, container) {
    //这里的children就是文本
    const { children } = vnode;
    const textNode = (vnode.el = document.createTextNode(children));
    container.append(textNode);
}
//处理element类型的vnode
function processElement(vnode, container) {
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    const { type, props, children, shapeFlag } = vnode;
    //使用连续赋值，把el赋值给vnode.el
    //但是这里的vnode是element类型的（div），组件的vnode上是没有值的，所以要在下面赋值给组件的el
    const el = vnode.el = document.createElement(type); //type就是element的类型(div,p,h1...)
    const isOn = (key) => /^on[A-Z]/.test(key);
    for (const key in props) {
        if (isOn(key)) {
            el.addEventListener(key.slice(2).toLowerCase(), props[key]);
        }
        el.setAttribute(key, props[key]);
    }
    if (shapeFlag & 4 /* TEXT_CHILDREN */) {
        //如果children是字符串，就直接显示
        el.textContent = children;
    }
    else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
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

//props是子组件往外传递的变量对象
function renderSlots(slots, name, props) {
    //slot此时是一个function
    const slot = slots[name];
    // console.log(slot)
    if (typeof slot === 'function') {
        //这里的slot就是(props) => normalizeSlotValue(value(props))这个函数
        return createVNode(Fragment, {}, slot(props));
    }
}

export { createApp, createTextVNode, getCurrentInstance, h, renderSlots };
