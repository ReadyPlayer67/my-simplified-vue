'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function toDisplayString(value) {
    return String(value);
}

const extend = Object.assign;
const EMPTY_OBJ = {};
const isObject = (val) => val !== null && typeof val === 'object';
const isArray = Array.isArray;
const isFunction = (val) => typeof val === 'function';
const isString = (val) => typeof val === 'string';
const hasChange = (val, newVal) => {
    return !Object.is(val, newVal);
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

//使用Symbol创建一个全局变量作为Fragment类型vnode的type
const Fragment = Symbol('Fragment');
const Text = Symbol('Text');
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        component: null,
        key: props && props.key,
        shapeFlag: getShapeFlag(type),
        el: null,
    };
    if (typeof children === 'string') {
        //vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.TEXT_CHILDREN 可以简写为
        vnode.shapeFlag |= 8 /* ShapeFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 16 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    else if (isFunction(type)) {
        vnode.shapeFlag |= 2 /* ShapeFlags.FUNCTIONAL_COMPONENT */;
    }
    //如果vnode是组件类型且children是object，我们才认为他有插槽
    if (vnode.shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */) {
        if (typeof vnode.children === 'object') {
            vnode.shapeFlag |= 32 /* ShapeFlags.SLOT_CHILDREN */;
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
        return 1 /* ShapeFlags.ELEMENT */;
    }
    else if (isObject(type)) {
        return 4 /* ShapeFlags.STATEFUL_COMPONENT */;
    }
    else if (isFunction(type)) {
        return 2 /* ShapeFlags.FUNCTIONAL_COMPONENT */;
    }
    else {
        return 0;
    }
}
//构建VNode的方法，比如节点是一段文本，包裹为Text类型的节点
function normalizeVNode(child) {
    if (isArray(child)) {
        // fragment
        return createVNode(Fragment, null, child.slice());
    }
    else if (typeof child === 'object') {
        return child;
    }
    else {
        return createVNode(Text, null, String(child));
    }
}
function isSameVNodeType(n1, n2) {
    return n1.type === n2.type && n1.key === n2.key;
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

const ITERATE_KEY = Symbol('');
let activeEffect; //用一个全局变量表示当前get操作触发的effect
let shouldTrack;
class ReactiveEffect {
    //scheduler? 表示该参数是一个可选参数
    constructor(fn, scheduler) {
        this.deps = [];
        this.active = true;
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        //执行run方法，即this._fn()的时候会触发收集依赖track，
        // 所以在这里拦截，如果stop了(this.active === false)，就不执行activeEffect = this,避免收集依赖
        if (!this.active) {
            return this._fn();
        }
        shouldTrack = true;
        activeEffect = this;
        const result = this._fn(); //这里_fn会触发get和track
        shouldTrack = false;
        return result;
    }
    stop() {
        //设置一个flag变量active，避免每次stop的时候都重复遍历deps
        if (this.active) {
            cleanupEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this.active = false;
        }
    }
}
const cleanupEffect = (effect) => {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    //effect.deps中每个set都被清空了，那本身也可以清空了
    effect.deps.length = 0;
};
let targetMap = new Map(); //每一个reactive对象里的每一个key都需要有一个dep容器存放effect，当key的value变化时触发effect，实现响应式
//在get操作的是触发依赖收集操作，将ReactiveEffect实例收集到一个dep容器中
const track = (target, key) => {
    if (!isTracking())
        return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
};
function trackEffects(dep) {
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    //在ReactiveEffect上挂载一个deps属性，用于记录存有这个effect的deps容器，这样执行stop的时候可以遍历删除
    activeEffect.deps.push(dep);
}
function isTracking() {
    //这里有个regression问题，因为activeEffect是在执行effect.run()的时候赋值的，而只要触发了get操作就会执行到这里读取activeEffect
    //在happy path单测中,只触发了get但没有执行effect，所以这时候activeEffect是undefined
    return shouldTrack && activeEffect !== undefined;
}
const trigger = (target, key, type, newValue) => {
    const depsMap = targetMap.get(target);
    if (!depsMap) {
        return;
    }
    let deps = [];
    const dep = depsMap.get(key);
    deps.push(dep);
    if (Array.isArray(target) && key === 'length') {
        //如果target是数组并且修改了数组的长度，对于索引大于等于新length的元素
        //需要把他们关联的副作用函数取出来并执行
        const newLength = Number(newValue);
        depsMap.forEach((dep, key) => {
            if (key === 'length' || key >= newLength) {
                deps.push(dep);
            }
        });
    }
    else {
        //如果是给对象添加/删除属性，会影响对象的遍历操作，需要额外触发遍历操作关联的副作用
        if (type === "add" /* TriggerOpTypes.ADD */) {
            //如果target是数组且操作类型为ADD，应该取出并执行那些与length相关的副作用函数
            if (Array.isArray(target)) {
                deps.push(depsMap.get('length'));
            }
            else {
                deps.push(depsMap.get(ITERATE_KEY));
            }
        }
        else if (type === "delete" /* TriggerOpTypes.DELETE */) {
            deps.push(depsMap.get(ITERATE_KEY));
        }
    }
    const effects = [];
    for (const dep of deps) {
        if (dep) {
            effects.push(...dep);
        }
    }
    triggerEffects(new Set(effects));
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
const effect = (fn, option = { lazy: false }) => {
    const _effect = new ReactiveEffect(fn, option.scheduler);
    //用一个extend方法将option上的熟悉拷贝到_effect上
    extend(_effect, option);
    //effect接收一个lazy选项，如果lazy为true则不立刻执行副作用
    if (!option.lazy) {
        _effect.run();
    }
    //这里注意要return的是将this绑定为_effect的run方法，不然在单元测试的上下文环境里this是undefined，执行this._fn()就会报错
    const runner = _effect.run.bind(_effect);
    //函数也是对象，可以添加属性，把effect挂载到runner上，用于之后执行stop
    runner.effect = _effect;
    return runner;
};
function pauseTracking() {
    shouldTrack = false;
}
function enableTracking() {
    shouldTrack = true;
}

//重写数组的部分方法
const arrayInstrumentations = createArrayInstrumentations();
function createArrayInstrumentations() {
    const instrumentations = {};
    ['includes', 'indexOf', 'lastIndexOf'].forEach((key) => {
        const originMethod = Array.prototype[key];
        instrumentations[key] = function (...args) {
            //因为用户传入的查找对象可能是原始对象，也可能是响应式对象
            //所以我们先去响应式数组中查找，如果找不到再去原始数组中查找
            let res = originMethod.apply(this, args);
            if (res === -1 || res === false) {
                res = originMethod.apply(this[ReactiveFlags.RAW], args);
            }
            return res;
        };
    });
    ['push', 'pop', 'shift', 'unshift', 'splice'].forEach((key) => {
        instrumentations[key] = function (...args) {
            pauseTracking();
            //执行
            const res = toRaw(this)[key].apply(this, args);
            enableTracking();
            return res;
        };
    });
    return instrumentations;
}
//将get和set缓存下来，这样就不用每次new Proxy()的时候就调用一次createGetter和createSetter
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
//使用高阶函数的技巧，这样就可以通过传参区分isReadonly
function createGetter(isReadonly = false, shallow = false) {
    return (target, key, receiver) => {
        //通过proxy拦截的get操作，判断获取的key，如果是ReactiveFlags.IS_REACTIVE，就return isReadonly
        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly;
        }
        else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly;
        }
        else if (key === ReactiveFlags.RAW) {
            return target;
        }
        if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
            return Reflect.get(arrayInstrumentations, key, receiver);
        }
        const res = Reflect.get(target, key, receiver);
        if (!isReadonly) {
            track(target, key);
        }
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
    return (target, key, value, receiver) => {
        const type = Array.isArray(target)
            ? //如果target是数组，检查被设置的索引值是否小于数组长度，如果是则视为SET操作，否则是ADD操作
                Number(key) < target.length
                    ? "set" /* TriggerOpTypes.SET */
                    : "add" /* TriggerOpTypes.ADD */
            : //如果属性不存在，则说明是添加新属性，否则是设置已有属性
                Object.prototype.hasOwnProperty.call(target, key)
                    ? "set" /* TriggerOpTypes.SET */
                    : "add" /* TriggerOpTypes.ADD */;
        //这里有个坑，要先执行反射set操作，再执行trigger，不然effect里拿到依赖的值还是原始值
        const res = Reflect.set(target, key, value);
        if (target === toRaw(receiver)) {
            trigger(target, key, type, value);
        }
        return res;
    };
}
function has(target, key) {
    const res = Reflect.has(target, key);
    track(target, key);
    return res;
}
function deleteProperty(target, key) {
    const hadKey = Object.prototype.hasOwnProperty.call(target, key);
    const res = Reflect.deleteProperty(target, key);
    //只有当被删除的属性时对象自己的属性并且删除成功时，才触发更新
    if (res && hadKey) {
        trigger(target, key, "delete" /* TriggerOpTypes.DELETE */, undefined);
    }
    return res;
}
function ownKeys(target, key) {
    //如果target是数组，修改数组的length会影响for...in循环的结果，需要触发对应的副作用
    //所以以length为key把for...in相关的副作用收集起来
    track(target, Array.isArray(target) ? 'length' : ITERATE_KEY);
    return Reflect.ownKeys(target);
}
const mutableHandler = {
    get,
    set,
    has,
    deleteProperty,
    ownKeys,
    //实际vue还会拦截has,deleteProperty,ownKeys这些操作，他们同样会触发依赖收集
};
const readonlyHandler = {
    get: readonlyGet,
    //readonly对象，执行set的时候触发警告,不执行set反射操作
    set(target, key, value) {
        console.warn(`key ${key} set失败，readonly对象无法被set`);
        return true;
    },
    deleteProperty(target, key) {
        console.warn(`key ${key} delete失败，readonly对象无法被delete`);
        return true;
    },
};
const shallowReadonlyHandler = extend({}, readonlyHandler, {
    get: shallowReadonlyGet,
});

var ReactiveFlags;
(function (ReactiveFlags) {
    ReactiveFlags["IS_REACTIVE"] = "__v_isReactive";
    ReactiveFlags["IS_READONLY"] = "__v_isReadonly";
    ReactiveFlags["RAW"] = "__v_raw";
})(ReactiveFlags || (ReactiveFlags = {}));
//定义一个 Map 实例，存储原始对象到代理对象的映射
const reactiveMap = new WeakMap();
const reactive = (raw) => {
    return createReactiveObject(raw, mutableHandler, reactiveMap);
};
const readonly = (raw) => {
    return createReactiveObject(raw, readonlyHandler, reactiveMap);
};
const shallowReadonly = (raw) => {
    return createReactiveObject(raw, shallowReadonlyHandler, reactiveMap);
};
const isReactive = (value) => {
    //因为在proxy拦截的get操作里可以拿到isReadonly，所以只要触发get就可以判断isReactive，isReadonly同理
    //这里将结果转换为Boolean值，这样undefined就为false，就能通过这个方法检测原始对象
    return !!(value && value[ReactiveFlags.IS_REACTIVE]);
};
const isReadonly = (value) => {
    return !!(value && value[ReactiveFlags.IS_READONLY]);
};
const isProxy = (value) => {
    return isReactive(value) || isReadonly(value);
};
//用一个工具函数将new Proxy这样的底层代码封装起来
function createReactiveObject(target, baseHandler, proxyMap) {
    //如果proxyMap中存在target对应的代理对象，直接返回
    const existingProxy = proxyMap.get(target);
    if (existingProxy) {
        return existingProxy;
    }
    const proxy = new Proxy(target, baseHandler);
    proxyMap.set(target, proxy);
    return proxy;
}
function toRaw(observed) {
    //递归地去查找响应式对象observed的原始值属性ReactiveFlags.RAW，将每一个属性都改为原始值
    const raw = observed && observed[ReactiveFlags.RAW];
    return raw ? toRaw(raw) : observed;
}

//ref接收的都是基本类型的变量，无法用proxy做代理
//通过创建一个对象来包裹基本类型，通过改写get set方法去拦截
//这也就是用ref包裹以后必须通过.value去获取值的原因
class RefImpl {
    constructor(val) {
        this.__v_isRef = true;
        this._rawVal = val;
        this._val = convert(val);
        this.dep = new Set();
    }
    get value() {
        trackRefValue(this);
        return this._val;
    }
    set value(newValue) {
        //这里要处理一个边缘情况，因为this._val有可能是一个Proxy类型的值，无法和原始对象newValue进行比较
        //用一个_rawVal用于存放_val的原始值，用于比较
        if (hasChange(this._rawVal, newValue)) {
            this._rawVal = newValue;
            this._val = convert(newValue);
            triggerRefValue(this);
        }
    }
}
function convert(val) {
    return isObject(val) ? reactive(val) : val;
}
function trackRefValue(ref) {
    //这边要加一个判断，因为如果只是get value而没有设置effect，activeEffect是undefined，会报错
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
function triggerRefValue(ref) {
    triggerEffects(ref.dep);
}
function ref(val) {
    return new RefImpl(val);
}
function isRef(ref) {
    //通过一个属性来判断是否的ref，即是否是RefImpl实例
    //这里要转换成boolean，不然有可能拿到undefined
    return !!ref.__v_isRef;
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function proxyRefs(objectWithRef) {
    //拦截get操作，如果get到的是ref类型，就返回.value，否则直接返回get到的值
    return new Proxy(objectWithRef, {
        get(target, key) {
            //用上面实现的unRef直接可以实现
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            //拦截set，一般情况下都是直接执行Reflect.set，直接替换
            //有一种特殊情况，如果这个属性的值是一个ref，set的值不是ref，是一个普通变量，就需要把这个普通变量赋给ref的value
            if (isRef(target[key]) && !isRef(value)) {
                return (target[key].value = value);
            }
            else {
                return Reflect.set(target, key, value);
            }
        },
    });
}

//用一个map实现策略模式，省略一堆if else
const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
    $props: (i) => i.props,
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
    },
};

const initProps = (instance, raw) => {
    //因为组件有可能没有props，比如main.js中创建App，如果没有需要给一个空对象，不然用undefined创建shallowReadonly会报错
    instance.props = raw || {};
};

function emit(instance, event, ...args) {
    const { props } = instance;
    const handlerName = toHandlerKey(event);
    const handler = props[handlerName];
    handler && handler(...args);
}

function initSlots(instance, children) {
    if (instance.vnode.shapeFlag & 32 /* ShapeFlags.SLOT_CHILDREN */) {
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

var LifecycleHooks;
(function (LifecycleHooks) {
    LifecycleHooks["BEFORE_CREATE"] = "bc";
    LifecycleHooks["CREATED"] = "c";
    LifecycleHooks["BEFORE_MOUNT"] = "bm";
    LifecycleHooks["MOUNTED"] = "m";
    LifecycleHooks["BEFORE_UPDATE"] = "bu";
    LifecycleHooks["UPDATED"] = "u";
    LifecycleHooks["BEFORE_UNMOUNT"] = "bum";
    LifecycleHooks["UNMOUNTED"] = "um";
    LifecycleHooks["DEACTIVATED"] = "da";
    LifecycleHooks["ACTIVATED"] = "a";
    LifecycleHooks["RENDER_TRIGGERED"] = "rtg";
    LifecycleHooks["RENDER_TRACKED"] = "rtc";
    LifecycleHooks["ERROR_CAPTURED"] = "ec";
    LifecycleHooks["SERVER_PREFETCH"] = "sp";
})(LifecycleHooks || (LifecycleHooks = {}));

function createComponentInstance(vnode, parent) {
    const instance = {
        vnode,
        next: null,
        type: vnode.type,
        //null!表示初始赋值为null，但在后续处理中会对其进行赋值，明确不会为null，这样就无需将这个属性定义为可选属性
        update: null,
        props: {},
        slots: {},
        setupState: {},
        emit: () => { },
        isMounted: false,
        subTree: null,
        //将parent.provides赋值给当前instance的provides实现跨组件传值
        provides: parent ? parent.provides : {},
        parent,
        render: null,
        proxy: null,
        [LifecycleHooks.MOUNTED]: null,
        [LifecycleHooks.UPDATED]: null,
        ctx: {},
    };
    //这里使用了bind的偏函数功能，会给instance.emit添加一个新的参数instance并放在第一位
    //https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/bind#%E7%A4%BA%E4%BE%8B
    instance.emit = emit.bind(null, instance);
    return instance;
}
//区分一个组件是函数式组件还是有状态组件
function isStatefulComponent(instance) {
    return instance.vnode.shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */;
}
function setupComponent(instance) {
    const { props, children } = instance.vnode;
    const isStateful = isStatefulComponent(instance);
    //把vnode上的props挂载到组件instance上
    initProps(instance, props);
    initSlots(instance, children);
    const setupResult = isStateful
        ? setupStatefulComponent(instance) //初始化有状态的组件，与此相对的还有一个纯函数组件，是没有状态的
        : undefined;
    return setupResult;
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
            emit: instance.emit,
            slots: instance.slots,
        });
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
    else {
        finishComponentSetup(instance);
    }
}
function handleSetupResult(instance, setupResult) {
    //TODO function
    //setupResult有可能是function或者object
    //如果是function就认为是render函数，如果是object就注入到组件上下文中
    if (isObject(setupResult)) {
        //使用proxyRefs解包setupResult中的ref
        instance.setupState = proxyRefs(setupResult);
    }
    else if (isFunction(setupResult)) {
        instance.render = setupResult;
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    if (!instance.render) {
        //给instance设置render
        //如果有compiler函数并且用户没有提供render方法而提供了template模板，就执行编译template为render函数
        if (compiler && !Component.render) {
            if (Component.template) {
                Component.render = compiler(Component.template);
            }
        }
        instance.render = Component.render;
    }
}
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    //缓存之前的currentInstance
    const prev = instance;
    currentInstance = instance;
    //返回一个重置方法，如果要还原回之前的currentInstance，就调用这个方法
    return () => {
        currentInstance = prev;
    };
}
let compiler;
//暴露一个方法用来给编译函数compiler赋值
function registerRuntimeCompiler(_compiler) {
    compiler = _compiler;
}

//判断一个组件是否是KeepAlive组件
const isKeepAlive = (vnode) => vnode.type.__isKeepAlive;
const KeepAlive = {
    __isKeepAlive: true,
    setup(props, { slots }) {
        const instance = getCurrentInstance();
        const sharedContext = instance.ctx;
        //创建一个Map用来缓存组件
        const cache = new Map();
        const { renderer: { m: move, o: { createElement }, }, } = sharedContext;
        const storageContainer = createElement('div');
        sharedContext.activate = (vnode, container, anchor) => {
            move(vnode, container, anchor);
        };
        sharedContext.deactivate = (vnode) => {
            move(vnode, storageContainer, null);
        };
        return () => {
            const children = slots.default();
            const rawVNode = children[0];
            if (children.length > 1) {
                console.warn('KeepAlive 只能有一个子节点');
                return children;
            }
            else if (!(rawVNode.shapeFlag & 6 /* ShapeFlags.COMPONENT */)) {
                //如果子节点不是组件，无法缓存，直接渲染
                return rawVNode;
            }
            const key = rawVNode.key == null ? rawVNode.type : rawVNode.key;
            const cachedVNode = cache.get(key);
            if (cachedVNode) {
                rawVNode.el = cachedVNode.el;
                rawVNode.component = cachedVNode.component;
                rawVNode.shapeFlag |= 512 /* ShapeFlags.COMPONENT_KEPT_ALIVE */;
            }
            else {
                cache.set(key, rawVNode);
            }
            rawVNode.shapeFlag |= 256 /* ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE */;
            return rawVNode;
        };
    },
};

function defineAsyncComponent(source) {
    if (isFunction(source)) {
        source = { loader: source };
    }
    const { loader, loadingComponent } = source;
    let resolvedComp;
    return {
        name: 'AsyncComponentWrapper',
        setup() {
            const loaded = ref(false);
            const instance = currentInstance;
            loader().then((comp) => {
                //如果是用import()方法导入的异步组件，得到的comp是一个模块，真实组件实例在模块的default属性上
                if (comp[Symbol.toStringTag] === 'Module') {
                    comp = comp.default;
                }
                resolvedComp = comp;
                loaded.value = true;
            });
            return () => {
                if (loaded.value) {
                    return createInnerComp(resolvedComp, instance);
                }
                else if (loadingComponent) {
                    return createVNode(loadingComponent);
                }
            };
        },
    };
}
function createInnerComp(comp, parent) {
    const { props, children } = parent.vnode;
    const vnode = createVNode(comp, props, children);
    return vnode;
}

const createHook = (lifecycle) => {
    return (hook, target = currentInstance) => {
        if (target) {
            //将当前组件实例设置为target，以便挂载生命周期函数
            const reset = setCurrentInstance(target);
            const hooks = target[lifecycle] || (target[lifecycle] = []);
            hooks.push(hook);
            //挂载完之后记得还原组件实例为之前的组件实例
            reset();
        }
        else {
            console.error('生命周期函数只能在setup函数中使用');
        }
    };
};
const onMounted = createHook(LifecycleHooks.MOUNTED);
const onUpdated = createHook(LifecycleHooks.UPDATED);

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

const provide = (key, value) => {
    var _a;
    //存
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = (_a = currentInstance.parent) === null || _a === void 0 ? void 0 : _a.provides;
        //判断如果初始化过就不需要再重新赋值了
        if (provides === parentProvides) {
            //把parentProvides赋值给provides的原型，实现原型链
            //解构赋值是浅拷贝，修改provides并不会影响currentInstance.provides，所以两者都要赋值
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
};
const inject = (key, defaultValue) => {
    var _a;
    //取
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = (_a = currentInstance.parent) === null || _a === void 0 ? void 0 : _a.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === 'function') {
                return defaultValue();
            }
            return defaultValue;
        }
    }
};

function createAppApi(render) {
    //接收一个根组件
    return function createApp(rootComponent) {
        //返回一个对象，对象中有一个mount方法
        return {
            //render方法接收一个根容器
            mount(rootContainer) {
                //先要将component转换为vnode
                //所有的逻辑都会基于vnode做处理
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            },
        };
    };
}

//实现一个方法对比新老vnode的props，如果返回true代表变化了，要更新组件
function shouldUpdateComponent(preVNode, nextVNode) {
    const { props: preProps } = preVNode;
    const { props: nextProps } = nextVNode;
    for (const key in nextProps) {
        if (preProps[key] !== nextProps[key]) {
            return true;
        }
    }
    return false;
}

const queue = [];
//创建一个存放在渲染前执行的回调的队列
const activePreFlushCbs = [];
const p = Promise.resolve();
//设置一个标记，代表队列是否在刷新，即微任务是否已经创建并推入到微任务队列中
let isFlushPending = false;
function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    queueFlush();
}
//通过再创建一个微任务，新的微任务被推到微任务队列中
//等待前一个微任务，也就是渲染视图执行完之后再执行，在这里就能拿到最新的视图了
function nextTick(fn) {
    //如果用户传入回调函数fn，就在promise.then之后执行fn，否则就返回promise，让用户await
    return fn ? p.then(fn) : p;
}
function queueFlush() {
    //因为微任务只需要创建一次，所以用标记避免创建重复的微任务
    if (isFlushPending)
        return;
    isFlushPending = true;
    //nextTick创建一个微任务，利用微任务，promise.then会在所有同步代码执行完之后再去执行
    //所以instance.update会在所有同步代码执行完之后再执行
    nextTick(flushJobs);
}
function flushJobs() {
    console.log('microtask...');
    //在渲染前先遍历执行队列中的回调
    flushPreFlushCbs();
    let job;
    //从前往后遍历queue，执行里面的job（模拟队列先进先出）
    while ((job = queue.shift())) {
        job && job();
    }
    //最后执行了微任务以后将标记重置
    isFlushPending = false;
}
function flushPreFlushCbs() {
    for (let i = 0; i < activePreFlushCbs.length; i++) {
        activePreFlushCbs[i]();
    }
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText, } = options;
    function render(vnode, container) {
        //入口parentComponent是null
        patch(null, vnode, container, null, null);
    }
    //n1代表旧的vnode，n2代表新的vnode
    function patch(n1, n2, container, parentComponent, anchor) {
        console.log('patch');
        if (n1 && !isSameVNodeType(n1, n2)) {
            // anchor = getNextHostNode(n1)
            unmount(n1, parentComponent);
            n1 = null;
        }
        const { shapeFlag } = n2;
        switch (n2.type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent, anchor);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                //通过位运算符判断vnode的类型
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlag & 6 /* ShapeFlags.COMPONENT */) {
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                break;
        }
    }
    //处理Fragment类型节点
    function processFragment(n1, n2, container, parentComponent, anchor) {
        if (n1 == null) {
            mountChildren(n2.children, container, parentComponent, anchor);
        }
        else {
            patchChildren(n1, n2, container, parentComponent, anchor);
        }
    }
    //处理Text类型节点
    function processText(n1, n2, container) {
        //这里的children就是文本
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    //处理element类型的vnode
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            //如果n1不存在，是初始化
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        const el = (n2.el = n1.el);
        patchChildren(n1, n2, el, parentComponent, anchor);
        patchProps(el, oldProps, newProps);
    }
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const prevShapeFlag = n1 ? n1.shapeFlag : 0;
        const c1 = n1 && n1.children;
        const { shapeFlag } = n2;
        const c2 = n2.children;
        if (shapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
            if (prevShapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
                //老的是array，新的是text
                unmountChildren(c1, parentComponent);
                hostSetElementText(container, c2);
            }
            else {
                //老的是text，新的也是text
                if (c1 !== c2) {
                    hostSetElementText(container, c2);
                }
            }
        }
        else {
            if (prevShapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
                //老的是text，新的是array
                hostSetElementText(container, '');
                mountChildren(c2, container, parentComponent, anchor);
            }
            else {
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        let i = 0;
        const l2 = c2.length;
        let e1 = c1.length - 1;
        let e2 = l2 - 1;
        //对比左侧和右侧排除相同的前置节点和后置节点
        //对比左侧
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            i++;
        }
        //对比右侧
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        // console.log('i: ' + i)
        // console.log('e1: ' + e1)
        // console.log('e2: ' + e2)
        //新的比老的长 a b -> d c a b
        if (i > e1) {
            //e1指针移动到了i前面，说明老的节点都比对完了
            if (i <= e2) {
                //e2指针还在i的位置或后面，说明新的节点数组中还有没处理的节点，这些遗留的节点就是新增节点
                //i~e2是新增的节点下标范围，如果是在前面新增节点，e2+1就是insertBefore插入锚点的下标
                const nextPos = e2 + 1;
                //nextPos>=c2.length说明e2对应的节点已经是尾部节点了，此时就不需要锚点了，直接在尾部追加
                const anchor = nextPos < l2 ? c2[nextPos].el : null;
                while (i <= e2) {
                    //调用patch方法新增节点
                    patch(null, c2[i], container, parentComponent, anchor);
                    i++;
                }
            }
        }
        else if (i > e2) {
            //老的比新的长 a b c -> a b
            while (i <= e1) {
                //直接remove不存在的老节点
                hostRemove(c1[i].el);
                i++;
            }
        }
        else {
            //上面两种if-else是理想情况，处理完相同的前置节点和后置节点后总有一组节点被处理完毕，通过新增和删除就能实现比对
            //中间对比 a b c d f g -> a b e c f g
            const s1 = i;
            const s2 = i;
            //新节点数组中需要去对比的节点数量
            const toBePatched = e2 - s2 + 1;
            //新节点数组中已经对比过，并且在老节点数组中能够找到的节点数量
            let patched = 0;
            //新建一个map存放节点的key和节点在新节点数组中下标的mapping关系：{'c':3,'e':2}
            const keyToNewIndexMap = new Map();
            //创建一个数组并指定长度（利于性能），下标是节点在新节点数组的位置索引，值是在老节点数组中的位置索引（从1开始数，0代表新增的）
            //a,b,c,d,e,z,f,g -> a,b,d,c,y,e,f,g 就是[4,3,0,5]
            const newIndexToOldIndexMap = new Array(toBePatched);
            for (let i = 0; i < toBePatched; i++) {
                //初始化数组，0代表老节点数组中不存在这个节点
                newIndexToOldIndexMap[i] = 0;
            }
            //用一个变量标记节点是否是移动的
            let moved = false;
            //记录当前最大的newIndex，即遍历过程中遇到的最大索引值
            let maxNewIndexSoFar = 0;
            //遍历新节点数组，生成map映射
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                if (nextChild.key !== null) {
                    keyToNewIndexMap.set(nextChild.key, i);
                }
            }
            //遍历老节点数组变动部分，再去新节点数组中查找该节点的位置，从而填充newIndexToOldIndexMap
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                //如果已经对比过的节点数量超过需要对比的数量，说明不需要在比对了，直接删除 ced->ec
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el);
                    continue;
                }
                let newIndex; //老节点在新节点数组中的位置下标
                //如果用户设置了key属性，可以通过key直接查找到新元素的位置
                if (prevChild.key !== null) {
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    //如果用户没有设置key属性，就只能去遍历新节点数组，查找老节点在新节点数组中的位置
                    for (let j = s2; j <= e2; j++) {
                        if (isSameVNodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                //判断节点是否存在于新节点树中
                if (newIndex === undefined) {
                    //不存在就删除
                    hostRemove(c1[i].el);
                }
                else {
                    //newIndexToOldIndexMap的下标是在变动部分（i~e2）的位置索引，所以newIndex要减去s2
                    //值是在老节点数组的位置，但是不能是0，因为0代表在老节点数组中不存在该节点，所以+1以示区分
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    //记录下来当前最大的newIndex，如果我们在遍历过程中遇到的索引值都呈现递增趋势，说明不需要移动节点
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    //老节点存在于新节点数组中，则继续patch深层次对比新老两个元素（props，children...），并且patched++
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    //每对比完一个节点patched++
                    patched++;
                }
            }
            // console.log(newIndexToOldIndexMap)
            //获取最长递增子序列[5,3,4] -> [1,2]，如果moved为false，我们无需移动任何元素，自然也不需要计算最长递增子序列了
            const increasingNewIndexSequence = moved
                ? getSequence(newIndexToOldIndexMap)
                : [];
            // console.log(increasingNewIndexSequence)
            let j = increasingNewIndexSequence.length - 1;
            //这里使用反向循环，因为我们insertBefore方法需要插入元素的后一个元素
            //而后一个元素可能是需要移动或者新增的，这时候c2[nextIndex+1].el有可能是null
            for (let i = toBePatched - 1; i >= 0; i--) {
                //nextIndex是节点在新节点数组中真实的位置索引
                const nextIndex = i + s2;
                const nextChild = c2[nextIndex];
                const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;
                //0代表老的节点数组中没有该元素，执行插入
                if (newIndexToOldIndexMap[i] === 0) {
                    patch(null, nextChild, container, parentComponent, anchor);
                }
                else if (moved) {
                    //如果j<0代表最长递增子序列是空，说明顺序完全颠倒了，所有节点都需要移动
                    //或者当前节点不在稳定递增的序列中，就需要移动
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        // console.log('移动位置')
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    }
    function patchProps(el, oldProps, newProps) {
        if (oldProps !== newProps) {
            for (const key in newProps) {
                const oldProp = oldProps[key];
                const newProp = newProps[key];
                if (oldProp !== newProp) {
                    hostPatchProp(el, key, oldProp, newProp);
                }
            }
            //oldProps不为空对象才需要进行检查
            //注意：对象是引用类型，所以不能用==={}判断，应当对同一个引用进行判断
            if (oldProps !== EMPTY_OBJ) {
                for (const key in oldProps) {
                    //新props中不存在这个key了
                    if (!(key in newProps)) {
                        hostPatchProp(el, key, oldProps[key], null);
                    }
                }
            }
        }
    }
    function mountElement(vnode, container, parentComponent, anchor) {
        const { type, props, children, shapeFlag } = vnode;
        //使用连续赋值，把el赋值给vnode.el
        //但是这里的vnode是element类型的（div），组件的vnode上是没有值的，所以要在下面赋值给组件的el
        const el = (vnode.el = hostCreateElement(type));
        for (const key in props) {
            const val = props[key];
            hostPatchProp(el, key, null, val);
        }
        if (shapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
            //如果children是字符串，就直接显示
            el.textContent = children;
        }
        else if (shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
            //如果children是数组，说明是子元素，继续调用patch渲染
            mountChildren(vnode.children, el, parentComponent, anchor);
        }
        //把element append到页面上
        // container.append(el)
        hostInsert(el, container, anchor);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        // children.forEach((vnode) => {
        //   patch(null, vnode, container, parentComponent, anchor)
        // })
        for (let i = 0; i < children.length; i++) {
            const child = (children[i] = normalizeVNode(children[i]));
            patch(null, child, container, parentComponent, anchor);
        }
    }
    //处理组件类型的vnode
    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            //如果组件是被KeepAlive缓存的，直接激活而不是mount
            if (n2.shapeFlag & 512 /* ShapeFlags.COMPONENT_KEPT_ALIVE */) {
                parentComponent.ctx.activate(n2, container, anchor);
            }
            else {
                //挂载虚拟节点
                mountComponent(n2, container, parentComponent, anchor);
            }
        }
        else {
            updateComponent(n1, n2);
        }
    }
    function updateComponent(n1, n2) {
        //vnode上的component属性是在mountComponent时赋值的，n2是patch调用render方法生成的
        //它上面component属性初始值为null，所以这里需要赋值
        const instance = (n2.component = n1.component);
        if (shouldUpdateComponent(n1, n2)) {
            //在instance上新建一个next属性用来存储更新后的vnode，也就是n2
            instance.next = n2;
            //调用instance.update重新执行effect中的更新方法
            instance.update();
        }
        else {
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    const internals = {
        // p: patch,
        // um: unmount,
        m: move,
        // mt: mountComponent,
        // mc: mountChildren,
        // pc: patchChildren,
        o: options,
    };
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        //创建一个组件实例
        //同时把组件实例赋值给vnode上的component属性，在之后更新组件时会用到
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent));
        //如果组件是KeepAlive的，就在ctx上下文中注入一些方法
        if (isKeepAlive(initialVNode)) {
            instance.ctx.renderer = internals;
        }
        //初始化组件
        setupComponent(instance);
        //执行render方法
        setupRenderEffect(instance, initialVNode, container, anchor);
    }
    function unmount(vnode, parentComponent) {
        const { type, props, children, shapeFlag, el } = vnode;
        //如果组件是被KeepAlive包裹的，不要卸载而是失活
        if (shapeFlag & 256 /* ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE */) {
            parentComponent.ctx.deactivate(vnode);
            return;
        }
        if (shapeFlag && shapeFlag & 6 /* ShapeFlags.COMPONENT */) {
            unmountComponent(vnode.component);
        }
        else {
            hostRemove(el);
        }
    }
    function unmountChildren(children, parentComponent) {
        for (let child of children) {
            unmount(child, parentComponent);
        }
    }
    function unmountComponent(instance, parentComponent) {
        const { subTree } = instance;
        unmount(subTree, instance);
    }
    //移动节点的方法，用于将keepAlive节点移动到隐藏的容器中
    function move(vnode, container, anchor) {
        const { el, type, children, shapeFlag } = vnode;
        if (shapeFlag && shapeFlag & 6 /* ShapeFlags.COMPONENT */) {
            move(vnode.component.subTree, container, anchor);
            return;
        }
        hostInsert(el, container, anchor);
    }
    function setupRenderEffect(instance, initialVnode, container, anchor) {
        //用effect把render()方法包裹起来，第一次执行render会触发get，把依赖收集起来
        //之后响应式对象变化，会触发依赖，执行effect.fn，重新执行render，从而生成一个新的subTree
        //effect返回一个runner方法，执行runner方法会再次执行effect.run，把他赋值给instance.update，之后就可以调用这个方法来触发组件更新
        instance.update = effect(() => {
            const { type, vnode, proxy, props } = instance;
            let { render } = instance;
            //在instance上新增一个属性isMounted用于标记组件是否已经初始化，如果已经初始化，就进入update逻辑
            if (!instance.isMounted) {
                let subTree;
                if (vnode.shapeFlag &&
                    vnode.shapeFlag & 2 /* ShapeFlags.FUNCTIONAL_COMPONENT */) {
                    //如果是函数组件，组件的type为() => {...}，就是渲染函数
                    render = type;
                    subTree = normalizeVNode(render(props));
                }
                else {
                    //对于有状态组件，render函数就是instance.render
                    //把proxy对象挂载到render方法上（通过call指定render方法里this的值）
                    subTree = instance.subTree = normalizeVNode(render.call(proxy, proxy));
                }
                //vnode->element->mountElement
                //拿到组件的子组件，再交给patch方法处理
                patch(null, subTree, container, instance, anchor);
                //所有的element都已经mount了，也就是说组件被全部转换为了element组成的虚拟节点树结构
                //这时候subTree的el就是这个组件根节点的el，赋值给组件的el属性即可
                initialVnode.el = subTree.el;
                //组件挂载完毕后执行mounted生命周期
                instance[LifecycleHooks.MOUNTED] &&
                    instance[LifecycleHooks.MOUNTED].forEach((hook) => hook());
                instance.subTree = subTree;
                instance.isMounted = true;
            }
            else {
                //拿到更新后的vnode(next)和更新前的vnode
                const { type, vnode, proxy, props, next } = instance;
                let { render } = instance;
                let subTree;
                if (next) {
                    //vnode上的el属性只在mount的时候由subTree.el赋值，所以这里update的时候要给next.el赋值
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                if (vnode.shapeFlag &&
                    vnode.shapeFlag & 2 /* ShapeFlags.FUNCTIONAL_COMPONENT */) {
                    render = type;
                    subTree = normalizeVNode(render(props));
                }
                else {
                    subTree = normalizeVNode(render.call(proxy, proxy));
                }
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance, anchor);
                //组件更新完毕后执行updated生命周期
                instance[LifecycleHooks.UPDATED] &&
                    instance[LifecycleHooks.UPDATED].forEach((hook) => hook());
            }
        }, {
            scheduler() {
                console.log('update-scheduler');
                queueJobs(instance.update);
            },
        });
    }
    return {
        createApp: createAppApi(render),
    };
}
function updateComponentPreRender(instance, nextVNode) {
    //更新instance上的虚拟节点，新的赋值给vnode属性，next属性置为null
    instance.vnode = nextVNode;
    instance.next = null;
    //把更新后的props赋值给instance.props属性，这样this.$props就能拿到最新的props值了
    if (nextVNode.props) {
        instance.props = nextVNode.props;
    }
}
//求最长递增子序列的算法
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

const veiKey = Symbol('_vei');
//定义一个处理事件的方法
function patchEvent(el, key, prevVal, nextVal) {
    const invokers = el[veiKey] || (el[veiKey] = {});
    const existingInvoker = invokers[key];
    if (nextVal && existingInvoker) {
        //更新绑定事件
        existingInvoker.value = nextVal;
    }
    else {
        const name = key.slice(2).toLowerCase();
        if (nextVal) {
            //新增绑定事件
            const invoker = (invokers[key] = createInvoker(nextVal));
            el.addEventListener(name, invoker);
        }
        else if (existingInvoker) {
            //移除绑定事件
            el.removeEventListener(name, existingInvoker);
            invokers[key] = undefined;
        }
    }
}
function createInvoker(initialValue) {
    const invoker = (e) => {
        if (Array.isArray(invoker.value)) {
            invoker.value.forEach((fn) => fn(e));
        }
        else {
            invoker.value(e);
        }
    };
    invoker.value = initialValue;
    return invoker;
}

function createElement(type) {
    // console.log('createEl------------')
    return document.createElement(type);
}
function patchProp(el, key, prevVal, nextVal) {
    //如果是on开头的，就绑定事件
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        patchEvent(el, key, prevVal, nextVal);
    }
    //否则就是普通的设置attribute
    if (nextVal === undefined || nextVal === null) {
        el.removeAttribute(key);
    }
    else {
        el.setAttribute(key, nextVal);
    }
}
//用来插入和移动节点的方法，如果el是当前parent的子节点，就会把它移动到anchor节点前，否则就是插入节点
function insert(el, parent, anchor) {
    // console.log('insert------------')
    parent.insertBefore(el, anchor || null);
}
function remove(children) {
    const parent = children.parentNode;
    if (parent) {
        parent.removeChild(children);
    }
}
function setElementText(el, children) {
    el.textContent = children;
}
//下面两种写法等价
// export const {createApp} = createRenderer({createElement,patchProp,insert})
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createApp: createApp,
    h: h,
    KeepAlive: KeepAlive,
    defineAsyncComponent: defineAsyncComponent,
    onMounted: onMounted,
    onUpdated: onUpdated,
    renderSlots: renderSlots,
    createTextVNode: createTextVNode,
    createElementVNode: createVNode,
    getCurrentInstance: getCurrentInstance,
    registerRuntimeCompiler: registerRuntimeCompiler,
    provide: provide,
    inject: inject,
    createRenderer: createRenderer,
    nextTick: nextTick,
    toDisplayString: toDisplayString,
    ref: ref,
    proxyRefs: proxyRefs,
    isRef: isRef,
    unRef: unRef,
    reactive: reactive,
    readonly: readonly,
    shallowReadonly: shallowReadonly,
    isReactive: isReactive,
    isReadonly: isReadonly,
    isProxy: isProxy,
    effect: effect
});

//得到抽象语法树AST
function baseParse(content) {
    const context = createParserContext(content);
    return createRoot(parseChildren(context, []));
}
function parseChildren(context, ancestors) {
    let nodes = [];
    while (!isEnd(context, ancestors)) {
        let node;
        const s = context.source;
        if (s.startsWith('{{')) {
            node = parseInterpolation(context);
        }
        else if (s[0] === '<') { //如果是<开头，认为是一个element标签
            if (/[a-z]/i.test(s[1])) { //<后面必须是字母
                node = parseElement(context, ancestors);
            }
        }
        if (!node) {
            node = parseText(context);
        }
        nodes.push(node);
    }
    return nodes;
}
function isEnd(context, ancestors) {
    const s = context.source;
    //当source没有值或者遇到结束标签的时候，应当停止循环
    if (s.startsWith('</')) {
        //这里从后往前循环栈，因为如果标签是闭合的，头部标签一定是在栈顶的，这样循环有利于性能
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const tag = ancestors[i].tag;
            if (startsWithEndTagOpen(s, tag)) {
                return true;
            }
        }
    }
    return !s;
}
function parseText(context) {
    const endTokens = ['</', '{{'];
    let endIndex = context.source.length;
    for (let endToken of endTokens) {
        const index = context.source.indexOf(endToken);
        //如果读取到闭合标签或插值{{标签都需要停止读取，且要取到最小的索引位置
        if (index !== -1 && endIndex > index) {
            endIndex = index;
        }
    }
    const content = parseTextData(context, endIndex);
    return {
        type: 3 /* NodeTypes.TEXT */,
        content
    };
}
function parseTextData(context, length) {
    const content = context.source.slice(0, length);
    advanceBy(context, length);
    return content;
}
function parseElement(context, ancestors) {
    //处理<div>起始标签
    const element = parseTag(context, 0 /* TagType.Start */);
    //使用一个栈ancestors记录已经处理过的头部element标签
    ancestors.push(element);
    //在开始标签和闭合标签中间用parseChildren处理子节点内容
    element.children = parseChildren(context, ancestors);
    //处理完子节点并且里面的标签都是闭合的，无问题，此时就把element从栈中弹出
    ancestors.pop();
    // console.log('--------------', element.tag, context.source)
    //这里要判断下闭合标签名称是否是上面处理的标签名称一致，否则说明标签没有闭合，抛出错误
    if (startsWithEndTagOpen(context.source, element.tag)) {
        //处理</div>闭合标签，保证推进
        parseTag(context, 1 /* TagType.End */);
    }
    else {
        throw new Error(`缺少结束标签${element.tag}`);
    }
    return element;
}
//判断context.source下一段内容是不是tag的闭合标签
function startsWithEndTagOpen(source, tag) {
    return source.startsWith('</') && source.slice(2, tag.length + 2).toLowerCase() === tag.toLowerCase();
}
function parseTag(context, type) {
    //利用()实现分组捕获，这样在match[1]就能拿到tag内容
    const match = /^<\/?([a-z]*)/i.exec(context.source);
    // console.log('match:', match)
    //match[1]就是匹配到的tag类型
    const tag = match[1];
    //match[0]是匹配的全部字符串，也就是<div，往前推进<div和>的字符长度
    advanceBy(context, match[0].length);
    advanceBy(context, 1);
    //用一个标记代表处理的是<div>还是</div>闭合标签，如果是闭合标签就不用返回ast节点
    if (type === 1 /* TagType.End */)
        return;
    return {
        type: 2 /* NodeTypes.ELEMENT */,
        tag
    };
}
function parseInterpolation(context) {
    //定义前后两个分隔符
    const openDelimiter = '{{';
    const closeDelimiter = '}}';
    //查找闭合位置
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length);
    //往前推进两个字符，去除掉'{{'
    advanceBy(context, openDelimiter.length);
    //通过closeIndex减掉'{{'的长度（因为已经推进了2个字符）获得content的长度
    const rawContentLength = closeIndex - openDelimiter.length;
    //根据content长度截取context.source获取content
    const rawContent = parseTextData(context, rawContentLength);
    const content = rawContent.trim();
    //把已经处理过的内容删掉，继续往前推进处理后面的内容
    advanceBy(context, closeDelimiter.length);
    return {
        type: 0 /* NodeTypes.INTERPOLATION */,
        content: {
            type: 1 /* NodeTypes.SIMPLE_EXPRESSION */,
            content
        }
    };
}
function advanceBy(context, length) {
    context.source = context.source.slice(length);
}
function createRoot(children) {
    return {
        children,
        type: 4 /* NodeTypes.ROOT */
    };
}
function createParserContext(content) {
    return {
        source: content
    };
}

const TO_DISPLAY_STRING = Symbol('toDisplayString');
const CREATE_ELEMENT_VNODE = Symbol('createElementVNode');
const helperNameMap = {
    [TO_DISPLAY_STRING]: 'toDisplayString',
    [CREATE_ELEMENT_VNODE]: 'createElementVNode'
};

function transform(root, options = {}) {
    //创建一个上下文存放root和options
    const context = createTransformContext(root, options);
    traverseNode(root, context);
    //创建一个codegenNode作为生成render函数的入口节点
    createCodegenNode(root);
    root.helpers = [...context.helpers.keys()];
}
function createCodegenNode(root) {
    //获取root下的第一个节点，如果是element类型，就把element的codegenNode作为root的入口
    const child = root.children[0];
    if (child.type === 2 /* NodeTypes.ELEMENT */) {
        root.codegenNode = child.codegenNode;
    }
    else {
        root.codegenNode = root.children[0];
    }
}
function createTransformContext(root, options) {
    const context = {
        root,
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1);
        },
        nodeTransforms: options.nodeTransforms || []
    };
    return context;
}
//利用递归对ast树进行深度优先遍历
function traverseNode(node, context) {
    const { nodeTransforms } = context;
    let exitFns = [];
    //通过插件机制将容易变动的代码抽离出去，由外部去实现
    //这样程序的扩展性就变得很强了，并且提高了程序的可测试性
    for (const transform of nodeTransforms) {
        const onExit = transform(node, context);
        if (onExit)
            exitFns.push(onExit);
    }
    //根据节点类型给ast添加需要导入的模块helpers
    switch (node.type) {
        case 0 /* NodeTypes.INTERPOLATION */:
            context.helper(TO_DISPLAY_STRING);
            break;
        //root和element类型节点才会有children
        case 4 /* NodeTypes.ROOT */:
        case 2 /* NodeTypes.ELEMENT */:
            traverseChildren(node, context);
            break;
    }
    let i = exitFns.length;
    while (i--) {
        exitFns[i]();
    }
}
function traverseChildren(node, context) {
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
        traverseNode(children[i], context);
    }
}

function transformExpression(node) {
    if (node.type === 0 /* NodeTypes.INTERPOLATION */) {
        node.content = processExpression(node.content);
    }
}
function processExpression(node) {
    node.content = '_ctx.' + node.content;
    return node;
}

function createVNodeCall(context, tag, props, children) {
    context.helper(CREATE_ELEMENT_VNODE);
    return {
        type: 2 /* NodeTypes.ELEMENT */,
        tag,
        props,
        children
    };
}

function transformElement(node, context) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        return () => {
            //tag
            const vnodeTag = `'${node.tag}'`;
            //props
            let vnodeProps;
            //children
            const vnodeChildren = node.children[0];
            node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }
}

function isText(node) {
    return node.type === 3 /* NodeTypes.TEXT */ || node.type === 0 /* NodeTypes.INTERPOLATION */;
}

function transformText(node) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        return () => {
            const { children } = node;
            let currentContainer;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (isText(child)) {
                    //检查文字节点的后一个节点
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            //如果出现了两个相邻的文字节点
                            if (!currentContainer) {
                                //如果currentContainer不存在，代表是child是复合节点的第一项
                                //创建一个复合节点，并把文本节点替换为复合节点，并把文本节点放到children里
                                currentContainer = children[i] = {
                                    type: 5 /* NodeTypes.COMPOUND_EXPRESSION */,
                                    children: [child]
                                };
                            }
                            //往复合节点的children里追加+和下一个文本节点
                            currentContainer.children.push(' + ');
                            currentContainer.children.push(next);
                            //从children中删除next节点，并且把下标前移一位，以防循环提前中止
                            children.splice(j, 1);
                            j--;
                        }
                        else {
                            //如果再下一个节点不是文本节点了，就重置currentContainer并跳出内层循环，重新开始寻找新的可能的复合节点
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

function generate(ast) {
    const context = createCodegenContext();
    const { push } = context;
    genFunctionPreamble(ast, context);
    const functionName = 'render';
    const args = ['_ctx', '_cache'];
    const signature = args.join(', ');
    push(`function ${functionName} (${signature}) {`);
    push('return ');
    genNode(ast.codegenNode, context);
    push('}');
    return {
        code: context.code
    };
}
function createCodegenContext() {
    const context = {
        code: '',
        push(source) {
            context.code += source;
        },
        helper(key) {
            return `_${helperNameMap[key]}`;
        }
    };
    return context;
}
//处理前导码（import，const）这些
function genFunctionPreamble(ast, context) {
    const { push } = context;
    const VueBinging = 'Vue';
    const aliasHelper = (s) => `${helperNameMap[s]}: _${helperNameMap[s]}`;
    if (ast.helpers.length > 0) {
        push(`const { ${ast.helpers.map(helper => aliasHelper(helper)).join(', ')} } = ${VueBinging}`);
    }
    push('\n');
    push('return ');
}
function genNode(node, context) {
    switch (node.type) {
        case 0 /* NodeTypes.INTERPOLATION */:
            genInterpolation(node, context);
            break;
        case 3 /* NodeTypes.TEXT */:
            genText(node, context);
            break;
        case 1 /* NodeTypes.SIMPLE_EXPRESSION */:
            genExpression(node, context);
            break;
        case 2 /* NodeTypes.ELEMENT */:
            genElement(node, context);
            break;
        case 5 /* NodeTypes.COMPOUND_EXPRESSION */:
            genCompoundExpression(node, context);
            break;
    }
}
function genText(node, context) {
    const { push } = context;
    push(`'${node.content}'`);
}
function genInterpolation(node, context) {
    const { push, helper } = context;
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    push(')');
}
function genExpression(node, context) {
    const { push } = context;
    push(`${node.content}`);
}
function genElement(node, context) {
    const { push, helper } = context;
    const { tag, children, props } = node;
    push(`${helper(CREATE_ELEMENT_VNODE)}(`);
    genNodeList(genNullable([tag, props, children]), context);
    push(')');
}
function genNullable(args) {
    return args.map(arg => arg || 'null');
}
function genNodeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node);
        }
        else {
            genNode(node, context);
        }
        if (i < nodes.length - 1) {
            push(', ');
        }
    }
}
function genCompoundExpression(node, context) {
    const { push } = context;
    const { children } = node;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) { //符号+直接push
            push(child);
        }
        else { //文字类型节点
            genNode(child, context);
        }
    }
}

//暴露一个出口方法baseCompile
function baseCompile(template) {
    const ast = baseParse(template);
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText]
    });
    return generate(ast);
}

//mini-vue出口
function compileToFunction(template) {
    const { code } = baseCompile(template);
    //利用Function构造函数创建一个函数，参数名为Vue，函数体为我们通过compiler生成的代码字符串
    //然后我们执行这个方法，Vue参数即runtime-dom里面暴露出的createVNode...这些方法
    //这个方法返回一个function render，即instance.render需要的render函数
    const render = new Function('Vue', code)(runtimeDom);
    return render;
    //code为如下所示的字符串
    // const { toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock } = Vue
    // return function render(_ctx, _cache, $props, $setup, $data, $options) {
    //     return (_openBlock(), _createElementBlock("div", null, "hi," + _toDisplayString(_ctx.message), 1 /* TEXT */))
    // }
}
registerRuntimeCompiler(compileToFunction);

exports.KeepAlive = KeepAlive;
exports.createApp = createApp;
exports.createElementVNode = createVNode;
exports.createRenderer = createRenderer;
exports.createTextVNode = createTextVNode;
exports.defineAsyncComponent = defineAsyncComponent;
exports.effect = effect;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.isProxy = isProxy;
exports.isReactive = isReactive;
exports.isReadonly = isReadonly;
exports.isRef = isRef;
exports.nextTick = nextTick;
exports.onMounted = onMounted;
exports.onUpdated = onUpdated;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.reactive = reactive;
exports.readonly = readonly;
exports.ref = ref;
exports.registerRuntimeCompiler = registerRuntimeCompiler;
exports.renderSlots = renderSlots;
exports.shallowReadonly = shallowReadonly;
exports.toDisplayString = toDisplayString;
exports.unRef = unRef;
