import {track, trigger} from "./effect";
import {ReactiveFlags} from "./reactive";

//将get和set缓存下来，这样就不用每次new Proxy()的时候就调用一次createGetter和createSetter
const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)

//使用高阶函数的技巧，这样就可以通过传参区分isReadonly
function createGetter(isReadonly = false) {
    return (target: any, key: string | symbol) => {
        //通过proxy拦截的get操作，判断获取的key，如果是ReactiveFlags.IS_REACTIVE，就return isReadonly
        if(key === ReactiveFlags.IS_REACTIVE){
            return !isReadonly
        }else if(key === ReactiveFlags.IS_READONLY){
            return isReadonly
        }
        if (!isReadonly) {
            track(target, key)
        }
        return Reflect.get(target, key)
    }
}

function createSetter() {
    return (target: any, key: string | symbol, value: any) => {
        //这里有个坑，要先执行反射set操作，再执行trigger，不然effect里拿到依赖的值还是原始值
        const res = Reflect.set(target, key, value)
        trigger(target, key)
        return res
    }
}

export const mutableHandler = {
    get,
    set
}

export const readonlyHandler = {
    get: readonlyGet,
    //readonly对象，执行set的时候触发警告,不执行set反射操作
    set(target: any, key: string | symbol, value: any): boolean {
        console.warn(`key ${key as string} set失败，readonly对象无法被set`)
        return true
    }
}
