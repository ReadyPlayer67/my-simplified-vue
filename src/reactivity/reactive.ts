import {mutableHandler, readonlyHandler} from "./baseHandlers";

export const reactive = (raw: any) => {
    return createActiveObject(raw, mutableHandler)
}

export const readonly = (raw: any) => {
    return createActiveObject(raw, readonlyHandler)
}

//用一个工具函数将new Proxy这样的底层代码封装起来
function createActiveObject(raw: any, baseHandler) {
    return new Proxy(raw, baseHandler)
}
