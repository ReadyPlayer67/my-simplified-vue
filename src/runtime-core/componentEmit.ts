import {toHandlerKey} from "../shared";

export function emit(instance,event,...args){
    const {props} = instance

    const handlerName = toHandlerKey(event)
    const handler = props[handlerName]
    handler && handler(...args)
}
