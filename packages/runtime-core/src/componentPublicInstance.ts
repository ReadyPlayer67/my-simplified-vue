//用一个map实现策略模式，省略一堆if else
import {hasOwn} from "@my-simplified-vue/shared";

const publicPropertiesMap = {
    $el:(i) => i.vnode.el,
    $slots:(i) => i.slots,
    $props:(i) => i.props
}

export const PublicInstanceProxyHandlers = {
    //通过给target对象新增一个_属性来实现传值
    get({_:instance}, key: string | symbol): any {
        const {setupState,props} = instance
        //hasOwn方法用来检测对象中是否包含这个key
        if(hasOwn(setupState,key)){
            return setupState[key]
        }else if(hasOwn(props,key)){
            return props[key]
        }
        const publicGetter = publicPropertiesMap[key]
        if(publicGetter){
            return publicGetter(instance)
        }
    }
}
