import { shallowReadonly, proxyRefs } from '@my-simplified-vue/reactivity'
import { PublicInstanceProxyHandlers } from './componentPublicInstance'
import { initProps } from './componentProps'
import { emit } from './componentEmit'
import { initSlots } from './componentSlots'
import { Fragment, VNode } from './vnode'
import { LifecycleHooks } from './enums'

export interface ComponentInternalInstance {
  vnode: VNode
  next: VNode | null
  type: string | Symbol | ComponentOptions
  update: Function
  props: Record<string, unknown>
  slots: any
  setupState: Record<string, unknown>
  emit: Function
  isMounted: boolean
  subTree: VNode
  provides: Record<string, unknown>
  parent: ComponentInternalInstance | null
  render: Function | null
  proxy: any
  [LifecycleHooks.MOUNTED]: Function[] | null
  [LifecycleHooks.UPDATED]: Function[] | null
}

export interface ComponentOptions {
  setup?: (this: void, props: any, ctx: any) => void
}

export function createComponentInstance(vnode: VNode, parent) {
  const instance: ComponentInternalInstance = {
    vnode,
    next: null,
    type: vnode.type,
    //null!表示初始赋值为null，但在后续处理中会对其进行赋值，明确不会为null，这样就无需将这个属性定义为可选属性
    update: null!,
    props: {},
    slots: {},
    setupState: {},
    emit: () => {},
    isMounted: false,
    subTree: null!,
    //将parent.provides赋值给当前instance的provides实现跨组件传值
    provides: parent ? parent.provides : {},
    parent,
    render: null,
    proxy: null,
    [LifecycleHooks.MOUNTED]: null,
    [LifecycleHooks.UPDATED]: null,
  }
  //这里使用了bind的偏函数功能，会给instance.emit添加一个新的参数instance并放在第一位
  //https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/bind#%E7%A4%BA%E4%BE%8B
  instance.emit = emit.bind(null, instance) as any
  return instance
}

export function setupComponent(instance: ComponentInternalInstance) {
  const { props, children } = instance.vnode
  //把vnode上的props挂载到组件instance上
  initProps(instance, props)
  initSlots(instance, children)
  //初始化有状态的组件，与此相对的还有一个纯函数组件，是没有状态的
  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance: ComponentInternalInstance) {
  //调用setup()，拿到返回值
  //通过instance.vnode.type拿到组件options，在从中拿到setup
  const Component = instance.type as ComponentOptions
  //通过实现一个代理对象，并把这个代理对象挂载到render方法上，这样render方法里就可以通过this.key拿到setupState中的key属性的值
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers)
  const { setup } = Component
  if (setup) {
    setCurrentInstance(instance)
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
      slots: instance.slots,
    })
    setCurrentInstance(null)
    handleSetupResult(instance, setupResult)
  }
}

function handleSetupResult(instance, setupResult) {
  //TODO function
  //setupResult有可能是function或者object
  //如果是function就认为是render函数，如果是object就注入到组件上下文中
  if (typeof setupResult === 'object') {
    //使用proxyRefs解包setupResult中的ref
    instance.setupState = proxyRefs(setupResult)
  }
  finishComponentSetup(instance)
}

function finishComponentSetup(instance) {
  const Component = instance.type
  //给instance设置render
  //如果有compiler函数并且用户没有提供render方法而提供了template模板，就执行编译template为render函数
  if (compiler && !Component.render) {
    if (Component.template) {
      Component.render = compiler(Component.template)
    }
  }
  instance.render = Component.render
}

export let currentInstance: ComponentInternalInstance | null = null
export function getCurrentInstance() {
  return currentInstance
}

export function setCurrentInstance(instance: ComponentInternalInstance | null) {
  //缓存之前的currentInstance
  const prev = instance
  currentInstance = instance
  //返回一个重置方法，如果要还原回之前的currentInstance，就调用这个方法
  return () => {
    currentInstance = prev
  }
}

let compiler
//暴露一个方法用来给编译函数compiler赋值
export function registerRuntimeCompiler(_compiler) {
  compiler = _compiler
}
