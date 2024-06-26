//用一个map实现策略模式，省略一堆if else
import { hasOwn } from '@my-simplified-vue/shared'
import { ComponentInternalInstance } from './component'

export interface ComponentRenderContext {
  [key: string]: any
  _: ComponentInternalInstance
}

export type PublicPropertiesMap = Record<string, (i: ComponentInternalInstance) => any>

const publicPropertiesMap: PublicPropertiesMap = {
  $el: (i) => i.vnode.el,
  $slots: (i) => i.slots,
  $props: (i) => i.props,
}

export const PublicInstanceProxyHandlers: ProxyHandler<any> = {
  //通过给target对象新增一个_属性来实现传值
  get({ _: instance }: ComponentRenderContext, key: string): any {
    const { setupState, props } = instance
    //hasOwn方法用来检测对象中是否包含这个key
    if (hasOwn(setupState, key)) {
      return setupState[key]
    } else if (hasOwn(props, key)) {
      return props[key]
    }
    const publicGetter = publicPropertiesMap[key]
    if (publicGetter) {
      return publicGetter(instance)
    }
  },
  set({ _: instance }: ComponentRenderContext, key: string, value: any): boolean {
    const { setupState, props } = instance
    if(hasOwn(setupState,key)){
      setupState[key] = value
      return true
    }else if(hasOwn(props, key)){
      console.warn(`属性 ${key} 属于props，不能被修改`)
      return false
    }
    if(key[0] === '$'){
      console.warn(`属性 ${key} 以$开头，不能被修改`)
      return false
    }
    return true
  },
}
