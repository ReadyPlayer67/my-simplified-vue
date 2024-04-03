import { Component } from './component'
import { createVNode } from './vnode'

export function createAppApi(render) {
  //接收一个根组件
  return function createApp(rootComponent: Component) {
    //返回一个对象，对象中有一个mount方法
    return {
      //render方法接收一个根容器
      mount(rootContainer) {
        //先要将component转换为vnode
        //所有的逻辑都会基于vnode做处理
        const vnode = createVNode(rootComponent)
        render(vnode, rootContainer)
      },
    }
  }
}
//使用createApp方法
// import { createApp } from 'vue'
// import App from './app'
// const app = createApp(App)
// app.mount('#app')
