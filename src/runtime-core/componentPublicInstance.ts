//用一个map实现策略模式，省略一堆if else
const publicPropertiesMap = {
    $el:(i) => i.vnode.el
}

export const PublicInstanceProxyHandlers = {
    //通过给target对象新增一个_属性来实现传值
    get({_:instance}, key: string | symbol): any {
        const {setupState} = instance
        if(key in setupState){
            return setupState[key]
        }
        const publicGetter = publicPropertiesMap[key]
        if(publicGetter){
            return publicGetter(instance)
        }
    }
}