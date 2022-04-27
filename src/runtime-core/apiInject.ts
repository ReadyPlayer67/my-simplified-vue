import {getCurrentInstance} from "./component";

export const provide = (key,value) => {
    //存
    const currentInstance:any = getCurrentInstance()
    const {provides} = currentInstance
    provides[key] = value
}

export const inject = (key) => {
    //取
    const currentInstance:any = getCurrentInstance()
    return currentInstance.parent.provides[key]
}