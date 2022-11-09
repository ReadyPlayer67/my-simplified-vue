import { track, trigger } from "./effect";
import { reactive, ReactiveFlags, readonly } from "./reactive";
import { extend, isObject } from "@my-simplified-vue/shared";
import { TriggerOpTypes } from './operations'

//将get和set缓存下来，这样就不用每次new Proxy()的时候就调用一次createGetter和createSetter
const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

//使用高阶函数的技巧，这样就可以通过传参区分isReadonly
function createGetter(isReadonly = false, shallow = false) {
    return (target: any, key: string | symbol) => {
        //通过proxy拦截的get操作，判断获取的key，如果是ReactiveFlags.IS_REACTIVE，就return isReadonly
        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly
        } else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly
        }
        const res = Reflect.get(target, key)
        //如果是shallowReadonly，就不需要做嵌套readonly转换了，直接return
        if (shallow) {
            return res
        }
        //如果get到的也是个对象，对这个对象也实现reactive/readonly，从而实现嵌套的响应式/只读
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res)
        }
        if (!isReadonly) {
            track(target, key)
        }
        return res
    }
}

function createSetter() {
    return (target: any, key: string | symbol, value: any) => {
        //如果属性不存在，则说明是添加新属性，否则是设置已有属性
        const type = Object.prototype.hasOwnProperty.call(target,key) ? TriggerOpTypes.SET : TriggerOpTypes.ADD
        //这里有个坑，要先执行反射set操作，再执行trigger，不然effect里拿到依赖的值还是原始值
        const res = Reflect.set(target, key, value)
        trigger(target, key, type)
        return res
    }
}

function has(target: any, key: string | symbol) {
    const res = Reflect.has(target, key)
    track(target, key)
    return res
}

function deleteProperty(target, key) {
    const hadKey = Object.prototype.hasOwnProperty.call(target, key)
    const res = Reflect.deleteProperty(target, key)
    //只有当被删除的属性时对象自己的属性并且删除成功时，才触发更新
    if (res && hadKey) {
        trigger(target, key, TriggerOpTypes.DELETE)
    }
    return res
}

export const mutableHandler = {
    get,
    set,
    has,
    deleteProperty
    //实际vue还会拦截has,deleteProperty,ownKeys这些操作，他们同样会触发依赖收集
}

export const readonlyHandler = {
    get: readonlyGet,
    //readonly对象，执行set的时候触发警告,不执行set反射操作
    set(target: any, key: string | symbol, value: any): boolean {
        console.warn(`key ${key as string} set失败，readonly对象无法被set`)
        return true
    }
}

export const shallowReadonlyHandler = extend({}, readonlyHandler, {
    get: shallowReadonlyGet
})
