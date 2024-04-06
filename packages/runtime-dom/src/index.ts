import { createRenderer } from '@my-simplified-vue/runtime-core'
import { patchEvent } from './modules/event'

function createElement(type) {
  // console.log('createEl------------')
  return document.createElement(type)
}

function patchProp(el, key: string, prevVal, nextVal) {
  //如果是on开头的，就绑定事件
  const isOn = (key: string) => /^on[A-Z]/.test(key)
  if (isOn(key)) {
    patchEvent(el, key, prevVal, nextVal)
  }
  //否则就是普通的设置attribute
  if (nextVal === undefined || nextVal === null) {
    el.removeAttribute(key)
  } else {
    el.setAttribute(key, nextVal)
  }
}

//用来插入和移动节点的方法，如果el是当前parent的子节点，就会把它移动到anchor节点前，否则就是插入节点
function insert(el, parent, anchor) {
  // console.log('insert------------')
  parent.insertBefore(el, anchor || null)
}

function remove(children) {
  const parent = children.parentNode
  if (parent) {
    parent.removeChild(children)
  }
}

function setElementText(el, children) {
  el.textContent = children
}

function querySelector(selector: string) {
  return document.querySelector(selector)
}

//下面两种写法等价
// export const {createApp} = createRenderer({createElement,patchProp,insert})
// const renderer: any = createRenderer({
//   createElement,
//   patchProp,
//   insert,
//   remove,
//   setElementText,
//   querySelector,
// })

//写一个ensureRenderer方法用来延迟加载渲染器，这样用户如果不用runtime模块，就不会创建渲染器
//tree-shaking就能移除runtime的代码，减小打包生成的代码体积
let renderer
function ensureRenderer() {
  return (
    renderer ||
    (renderer = createRenderer({
      createElement,
      patchProp,
      insert,
      remove,
      setElementText,
      querySelector,
    }))
  )
}
export function createApp(...args) {
  const app = ensureRenderer().createApp(...args)
  return app
}

//runtime-core是runtime-dom依赖的上层，所以放在这里导出
export * from '@my-simplified-vue/runtime-core'
