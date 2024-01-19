//导出h方法
export { h } from './h'
export { onMounted, onUpdated } from './apiLifecycle'
export { renderSlots } from './helpers/renderSlots'
export { createTextVNode, createElementVNode } from './vnode'
export { getCurrentInstance, registerRuntimeCompiler } from './component'
export { provide, inject } from './apiInject'
export { createRenderer } from './renderer'
export { nextTick } from './scheduler'
export { toDisplayString } from '@my-simplified-vue/shared'
export * from '@my-simplified-vue/reactivity'
