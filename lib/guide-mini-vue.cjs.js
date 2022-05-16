'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

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

const extend = Object.assign;
const EMPTY_OBJ = {};
const isObject = (val) => {
    return val !== null && typeof val === 'object';
};
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

//用一个map实现策略模式，省略一堆if else
const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
    $props: (i) => i.props
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
        //执行run方法，其实是this._fn()的时候会触发收集依赖track，
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
const effect = (fn, option = {}) => {
    const _effect = new ReactiveEffect(fn, option.scheduler);
    //用一个extend方法将option上的熟悉拷贝到_effect上
    extend(_effect, option);
    _effect.run();
    //这里注意要return的是将this绑定为_effect的run方法，不然在单元测试的上下文环境里this是undefined，会报错
    const runner = _effect.run.bind(_effect);
    //函数也是对象，可以添加属性，把effect挂载到runner上，用于之后执行stop
    runner.effect = _effect;
    return runner;
};

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
        if (!isReadonly) {
            track(target, key);
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
            triggerEffects(this.dep);
        }
    }
}
function convert(val) {
    return isObject(val) ? reactive(val) : val;
}
function trackRefValue(ref) {
    //这边要加一个判断，因为如果只是获取value而没有设置effect，activeEffect是没有值的，会报错
    if (isTracking()) {
        trackEffects(ref.dep);
    }
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
                return target[key].value = value;
            }
            else {
                return Reflect.set(target, key, value);
            }
        }
    });
}

function createComponentInstance(vnode, parent) {
    const instance = {
        vnode,
        next: null,
        type: vnode.type,
        update: null,
        props: {},
        slots: {},
        setupState: {},
        emit: () => { },
        isMounted: false,
        subTree: {},
        //将parent.provides赋值给当前instance的provides实现跨组件传值
        provides: parent ? parent.provides : {},
        parent
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
}
function handleSetupResult(instance, setupResult) {
    //TODO function
    //setupResult有可能是function或者object
    //如果是function就认为是render函数，如果是object就注入到组件上下文中
    if (typeof setupResult === 'object') {
        //使用proxyRefs解包setupResult中的ref
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
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
    let job;
    //从前往后遍历queue，执行里面的job（模拟队列先进先出）
    while (job = queue.shift()) {
        job && job();
    }
    //最后执行了微任务以后将标记重置
    isFlushPending = false;
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText } = options;
    function render(vnode, container) {
        //入口parentComponent是null
        patch(null, vnode, container, null, null);
    }
    //n1代表旧的vnode，n2代表新的vnode
    function patch(n1, n2, container, parentComponent, anchor) {
        console.log('patch');
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
                if (shapeFlag & 1 /* ELEMENT */) {
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                break;
        }
    }
    //处理Fragment类型节点
    function processFragment(n1, n2, container, parentComponent, anchor) {
        mountChildren(n2.children, container, parentComponent, anchor);
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
        if (!n1) { //如果n1不存在，是初始化
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
        const prevShapeFlag = n1.shapeFlag;
        const c1 = n1.children;
        const { shapeFlag } = n2;
        const c2 = n2.children;
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            if (prevShapeFlag & 8 /* ARRAY_CHILDREN */) {
                //老的是array，新的是text
                unmountChildren(c1);
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
            if (prevShapeFlag & 4 /* TEXT_CHILDREN */) {
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
        function isSameVNodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key;
        }
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
        if (i > e1) { //e1指针移动到了i前面，说明老的节点都比对完了
            if (i <= e2) { //e2指针还在i的位置或后面，说明新的节点数组中还有没处理的节点，这些遗留的节点就是新增节点
                //i~e2是新增的节点下标范围，如果是在前面新增节点，e2+1就是insertBefore插入节点的下标
                const nextPos = e2 + 1;
                //nextPos<c2.length说明e2对应的节点已经是尾部节点了，此时就不需要锚点了，直接在尾部追加
                const anchor = nextPos < l2 ? c2[nextPos].el : null;
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor);
                    i++;
                }
            }
        }
        else if (i > e2) { //老的比新的长 a b c -> a b
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
            //已经对比过的节点数量
            let patched = 0;
            //新建一个map存放节点的key和节点在新节点数组中下标的mapping关系{'c':3,'e':2}
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
            //遍历新节点数组，生成map影射
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                keyToNewIndexMap.set(nextChild.key, i);
            }
            //遍历老节点数组，再去新节点数组中查找该节点是否存在
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                //如果已经比对移动过的数量超过需要对比的数量，说明不需要在比对了，直接删除 ced->ec
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el);
                    continue;
                }
                let newIndex; //老节点在新节点数组中的位置下标
                //如果用户设置了key属性，可以直接通过key直接查找到新元素的位置
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
                    //不存在删除
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
                    //存在则继续patch深层次对比新老两个元素（props，children...），并且patched++
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    patched++;
                }
            }
            // console.log(newIndexToOldIndexMap)
            //获取最长递增子序列[5,3,4] -> [1,2]
            const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : [];
            // console.log(increasingNewIndexSequence)
            let j = increasingNewIndexSequence.length - 1;
            //这里使用反向循环，因为我们insertBefore插入元素需要后一个元素，后一个元素可能是需要移动或者新增的，这时候c2[nextIndex+1].el有可能是不存在的
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
                    //如果j<0代表最长递增子序列是空，说明顺序全反了
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
    function unmountChildren(children) {
        for (let item of children) {
            const el = item.el;
            hostRemove(el);
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
        const el = vnode.el = hostCreateElement(type);
        for (const key in props) {
            const val = props[key];
            hostPatchProp(el, key, null, val);
        }
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            //如果children是字符串，就直接显示
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
            //如果children是数组，说明是子元素，继续调用patch渲染
            mountChildren(vnode.children, el, parentComponent, anchor);
        }
        //把element append到页面上
        // container.append(el)
        hostInsert(el, container, anchor);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach(vnode => {
            patch(null, vnode, container, parentComponent, anchor);
        });
    }
    //处理组件类型的vnode
    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            //挂载虚拟节点
            mountComponent(n2, container, parentComponent, anchor);
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
            //在instance上新建一个next用来存储要更新的vnode，也就是n2
            instance.next = n2;
            instance.update();
        }
        else {
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    function mountComponent(initialVnode, container, parentComponent, anchor) {
        //创建一个组件实例
        //同时把组件实例赋值给vnode上的component属性，在之后更新组件时会用到
        const instance = (initialVnode.component = createComponentInstance(initialVnode, parentComponent));
        //初始化组件
        setupComponent(instance);
        //执行render方法
        setupRenderEffect(instance, initialVnode, container, anchor);
    }
    function setupRenderEffect(instance, initialVnode, container, anchor) {
        //用effect把render()方法包裹起来，第一次执行render会触发get，把依赖收集起来
        //之后响应式对象变化，会触发依赖，执行effect.fn，重新执行render，从而生成一个新的subTree
        //effect返回一个runner方法，执行runner方法会再次执行effect.run，把他赋值给instance.update，之后就可以调用这个方法来触发组件更新
        instance.update = effect(() => {
            //在instance上新增一个属性isMounted用于标记组件是否已经初始化，如果已经初始化，就进入update逻辑
            if (!instance.isMounted) {
                //把proxy对象挂载到render方法上（通过call指定render方法里this的值）
                const { proxy } = instance;
                const subTree = (instance.subTree = instance.render.call(proxy));
                //vnode->element->mountElement
                //拿到组件的子组件，再交给patch方法处理
                patch(null, subTree, container, instance, anchor);
                //所有的element都已经mount了，也就是说组件被全部转换为了element组成的虚拟节点树结构
                //这时候subTree的el就是这个组件根节点的el，赋值给组件的el属性即可
                initialVnode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                //拿到更新后的vnode(next)和更新前的vnode
                const { next, vnode } = instance;
                if (next) {
                    //vnode上的el属性只在mount的时候由subTree.el赋值，所以这里update的时候要给next.el赋值
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                const { proxy } = instance;
                const subTree = instance.render.call(proxy);
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance, anchor);
            }
        }, {
            scheduler() {
                console.log('update-scheduler');
                queueJobs(instance.update);
            }
        });
    }
    return {
        createApp: createAppApi(render)
    };
}
function updateComponentPreRender(instance, nextVNode) {
    //更新instance上的虚拟节点，新的赋值给vnode属性，next属性置为null
    instance.vnode = nextVNode;
    instance.next = null;
    //把更新后的props赋值给instance.props属性，这样this.$props就能拿到最新的props值了
    instance.props = nextVNode.props;
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

function createElement(type) {
    // console.log('createEl------------')
    return document.createElement(type);
}
function patchProp(el, key, preVal, nextVal) {
    // console.log('patchProp------------')
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        el.addEventListener(key.slice(2).toLowerCase(), nextVal);
    }
    if (nextVal === undefined || nextVal === null) {
        el.removeAttribute(key);
    }
    else {
        el.setAttribute(key, nextVal);
    }
}
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
const renderer = createRenderer({ createElement, patchProp, insert, remove, setElementText });
function createApp(...args) {
    return renderer.createApp(...args);
}

exports.createApp = createApp;
exports.createRenderer = createRenderer;
exports.createTextVNode = createTextVNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.nextTick = nextTick;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.ref = ref;
exports.renderSlots = renderSlots;
