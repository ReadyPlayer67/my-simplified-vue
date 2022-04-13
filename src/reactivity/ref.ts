import {isTracking, trackEffects, triggerEffects} from "./effect";
import {hasChange, isObject} from "../shared";
import {reactive} from "./reactive";

//ref接收的都是基本类型的变量，无法用proxy做代理
//通过创建一个对象来包裹基本类型，通过改写get set方法去拦截
class RefImpl<T> {
    private _val: T;
    //每一个ref都必须有一个dep用于存放effect，依赖收集
    public dep;
    private _rawVal: T;
    constructor(val) {
        this._rawVal = val
        this._val = convert(val)
        this.dep = new Set()
    }

    get value() {
        trackRefValue(this)
        return this._val
    }

    set value(newValue) {
        //这里要处理一个边缘情况，因为this._val有可能是一个Proxy类型的值，无法和原始对象newValue进行比较
        //用一个_rawVal用于存放_val的原始值，用于比较
        if (hasChange(this._rawVal, newValue)) {
            this._rawVal = newValue
            this._val = convert(newValue)
            triggerEffects(this.dep)
        }
    }
}

function convert(val){
    return isObject(val) ? reactive(val) : val
}

function trackRefValue(ref) {
    //这边要加一个判断，因为如果只是获取value而没有设置effect，activeEffect是没有值的，会报错
    if (isTracking()) {
        trackEffects(ref.dep)
    }
}

export function ref<T>(val) {
    return new RefImpl<T>(val)
}
