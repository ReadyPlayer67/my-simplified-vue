import { isTracking, trackEffects, triggerEffects } from './effect'
import { hasChange, isObject } from '@my-simplified-vue/shared'
import { reactive } from './reactive'

//ref接收的都是基本类型的变量，无法用proxy做代理
//通过创建一个对象来包裹基本类型，通过改写get set方法去拦截
//这也就是用ref包裹以后必须通过.value去获取值的原因
class RefImpl<T> {
  private _val: T
  //每一个ref都必须有一个dep用于存放effect，依赖收集
  public dep
  private _rawVal: T
  public readonly __v_isRef = true
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
      triggerRefValue(this)
    }
  }
}

//包裹toRef属性的类
class ObjectRefImpl {
  public readonly __v_isRef = true

  constructor(private readonly _object, private readonly _key) {}

  get value() {
    const val = this._object[this._key]
    return val
  }

  set value(newVal) {
    this._object[this._key] = newVal
  }
}

function convert(val) {
  return isObject(val) ? reactive(val) : val
}

export function trackRefValue(ref) {
  //这边要加一个判断，因为如果只是get value而没有设置effect，activeEffect是undefined，会报错
  if (isTracking()) {
    trackEffects(ref.dep)
  }
}

export function triggerRefValue(ref) {
  triggerEffects(ref.dep)
}

export function ref<T>(val) {
  return createRef<T>(val)
}

function createRef<T>(rawValue: unknown) {
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl<T>(rawValue)
}

export function isRef(ref) {
  //通过一个属性来判断是否的ref，即是否是RefImpl实例
  //这里要转换成boolean，不然有可能拿到undefined
  return !!ref.__v_isRef
}

export function unRef(ref) {
  return isRef(ref) ? ref.value : ref
}

export function toRef(object, key) {
  const val = object[key]
  return isRef(val) ? val : new ObjectRefImpl(object, key)
}

export function toRefs(obj): any {
  const ret = {}
  for (const key in obj) {
    ret[key] = toRef(obj, key)
  }
  return ret
}

export function proxyRefs(objectWithRef) {
  //拦截get操作，如果get到的是ref类型，就返回.value，否则直接返回get到的值
  return new Proxy(objectWithRef, {
    get(target: any, key: string | symbol): any {
      //用上面实现的unRef直接可以实现
      return unRef(Reflect.get(target, key))
    },
    set(target: any, key: string | symbol, value: any): boolean {
      //拦截set，一般情况下都是直接执行Reflect.set，直接替换
      //有一种特殊情况，如果这个属性的值是一个ref，set的值不是ref，是一个普通变量，就需要把这个普通变量赋给ref的value
      if (isRef(target[key]) && !isRef(value)) {
        return (target[key].value = value)
      } else {
        return Reflect.set(target, key, value)
      }
    },
  })
}
