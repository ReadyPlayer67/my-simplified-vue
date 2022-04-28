import {getCurrentInstance} from "./component";

export const provide = (key,value) => {
    //存
    const currentInstance:any = getCurrentInstance()
    if(currentInstance){
        let {provides} = currentInstance
        const parentProvides = currentInstance.parent?.provides
        //判断如果初始化过就不需要再重新赋值了
        if(provides === parentProvides){
            //把parentProvides赋值给provides的原型，实现原型链
            //解构赋值是浅拷贝，修改provides并不会影响currentInstance.provides，所以两者都要赋值
            provides = currentInstance.provides = Object.create(parentProvides)
        }
        provides[key] = value
    }
}

export const inject = (key,defaultValue) => {
    //取
    const currentInstance:any = getCurrentInstance()
    if(currentInstance){
        const parentProvides = currentInstance.parent?.provides
        if(key in parentProvides){
            return parentProvides[key]
        }else if(defaultValue){
            if(typeof defaultValue === 'function'){
                return defaultValue()
            }
            return defaultValue
        }
    }
}