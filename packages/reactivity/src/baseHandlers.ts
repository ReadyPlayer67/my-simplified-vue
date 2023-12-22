import {
  enableTracking,
  ITERATE_KEY,
  pauseTracking,
  track,
  trigger,
} from './effect'
import { reactive, ReactiveFlags, readonly, toRaw } from './reactive'
import { extend, isObject } from '@my-simplified-vue/shared'
import { TrackOpTypes, TriggerOpTypes } from './operations'

//重写数组的部分方法
const arrayInstrumentations = createArrayInstrumentations()

function createArrayInstrumentations() {
  const instrumentations: Record<string, Function> = {}
  ;['includes', 'indexOf', 'lastIndexOf'].forEach((key) => {
    const originMethod = Array.prototype[key]
    instrumentations[key] = function (...args: unknown[]) {
      //因为用户传入的查找对象可能是原始对象，也可能是响应式对象
      //所以我们先去响应式数组中查找，如果找不到再去原始数组中查找
      let res = originMethod.apply(this, args)
      if (res === -1 || res === false) {
        res = originMethod.apply(this[ReactiveFlags.RAW], args)
      }
      return res
    }
  })
  ;(['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach((key) => {
    instrumentations[key] = function (...args: unknown[]) {
      pauseTracking()
      //执行
      const res = toRaw(this)[key].apply(this, args)
      enableTracking()
      return res
    }
  })
  return instrumentations
}

//将get和set缓存下来，这样就不用每次new Proxy()的时候就调用一次createGetter和createSetter
const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

//使用高阶函数的技巧，这样就可以通过传参区分isReadonly
function createGetter(isReadonly = false, shallow = false) {
  return (target: any, key: string | symbol, receiver) => {
    //通过proxy拦截的get操作，判断获取的key，如果是ReactiveFlags.IS_REACTIVE，就return isReadonly
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.RAW) {
      return target
    }
    if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
      return Reflect.get(arrayInstrumentations, key, receiver)
    }
    const res = Reflect.get(target, key, receiver)
    if (!isReadonly) {
      track(target, key)
    }
    //如果是shallowReadonly，就不需要做嵌套readonly转换了，直接return
    if (shallow) {
      return res
    }
    //如果get到的也是个对象，对这个对象也实现reactive/readonly，从而实现嵌套的响应式/只读
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }
    return res
  }
}

function createSetter() {
  return (target: any, key: string | symbol, value: any, receiver: object) => {
    const type = Array.isArray(target)
      ? //如果target是数组，检查被设置的索引值是否小于数组长度，如果是则视为SET操作，否则是ADD操作
        Number(key) < target.length
        ? TriggerOpTypes.SET
        : TriggerOpTypes.ADD
      : //如果属性不存在，则说明是添加新属性，否则是设置已有属性
      Object.prototype.hasOwnProperty.call(target, key)
      ? TriggerOpTypes.SET
      : TriggerOpTypes.ADD
    //这里有个坑，要先执行反射set操作，再执行trigger，不然effect里拿到依赖的值还是原始值
    const res = Reflect.set(target, key, value)
    if (target === toRaw(receiver)) {
      trigger(target, key, type, value)
    }
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
    trigger(target, key, TriggerOpTypes.DELETE, undefined)
  }
  return res
}

function ownKeys(target, key) {
  //如果target是数组，修改数组的length会影响for...in循环的结果，需要触发对应的副作用
  //所以以length为key把for...in相关的副作用收集起来
  track(target, Array.isArray(target) ? 'length' : ITERATE_KEY)
  return Reflect.ownKeys(target)
}

export const mutableHandler = {
  get,
  set,
  has,
  deleteProperty,
  ownKeys,
  //实际vue还会拦截has,deleteProperty,ownKeys这些操作，他们同样会触发依赖收集
}

export const readonlyHandler = {
  get: readonlyGet,
  //readonly对象，执行set的时候触发警告,不执行set反射操作
  set(target: any, key: string | symbol, value: any): boolean {
    console.warn(`key ${key as string} set失败，readonly对象无法被set`)
    return true
  },
  deleteProperty(target: any, key: string | symbol): boolean {
    console.warn(`key ${key as string} delete失败，readonly对象无法被delete`)
    return true
  },
}

export const shallowReadonlyHandler = extend({}, readonlyHandler, {
  get: shallowReadonlyGet,
})
