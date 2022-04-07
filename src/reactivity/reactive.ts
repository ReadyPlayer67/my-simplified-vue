import {track, trigger} from "./effect";

export const reactive = (raw) => {
    const res = new Proxy(raw,{
        get(target: any, key: string | symbol): any {
            track(target,key)
            return Reflect.get(target, key)
        },
        set(target: any, key: string | symbol, value: any): boolean {
            //这里有个坑，要先执行反射set操作，再执行trigger，不然effect里拿到依赖的值还是原始值
            const res = Reflect.set(target,key,value)
            trigger(target,key)
            return res
        }
    })
    return res
}