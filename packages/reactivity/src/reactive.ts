import { mutableHandler, readonlyHandler, shallowReadonlyHandler } from "./baseHandlers";

export enum ReactiveFlags {
    IS_REACTIVE = '__v_isReactive',
    IS_READONLY = '__v_isReadonly',
    RAW = '__v_raw'
}

export const reactive = (raw: any) => {
    return createReactiveObject(raw, mutableHandler)
}

export const readonly = (raw: any) => {
    return createReactiveObject(raw, readonlyHandler)
}

export const shallowReadonly = (raw: any) => {
    return createReactiveObject(raw, shallowReadonlyHandler)
}

export const isReactive = (value) => {
    //因为在proxy拦截的get操作里可以拿到isReadonly，所以只要触发get就可以判断isReactive，isReadonly同理
    //这里将结果转换为Boolean值，这样undefined就为false，就能通过这个方法检测原始对象
    return !!value[ReactiveFlags.IS_REACTIVE]
}

export const isReadonly = (value) => {
    return !!value[ReactiveFlags.IS_READONLY]
}

export const isProxy = (value) => {
    return isReactive(value) || isReadonly(value)
}

//用一个工具函数将new Proxy这样的底层代码封装起来
function createReactiveObject(raw: any, baseHandler) {
    return new Proxy(raw, baseHandler)
}

export function toRaw<T>(observed: T): T {
    const raw = observed && observed[ReactiveFlags.RAW]
    return raw ? toRaw(raw) : observed
}