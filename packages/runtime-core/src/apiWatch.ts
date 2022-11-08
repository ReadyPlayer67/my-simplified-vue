import { ReactiveEffect, effect } from "../../reactivity/src/effect"
import { queuePreFlushCb } from "./scheduler"

export function watchEffect(source) {
  function job() {
    effect.run()
  }
  //用一个cleanup遍历存储用户传过来的cleanup函数
  let cleanup
  const onCleanup = (fn) => {
    //第一次执行effect时只做赋值操作，不执行fn
    cleanup = fn
    //effect.stop时会执行onStop方法
    effect.onStop = () => {
      fn()
    }
  }
  function getter() {
    //之后响应式变量变化时触发getter方法，进而执行cleanup
    //这样就实现了初始化effect时不执行cleanup，之后每次响应式发生变化再执行
    if (cleanup) {
      cleanup()
    }
    source(onCleanup)
  }
  const effect = new ReactiveEffect(getter, () => {
    queuePreFlushCb(job)
  })
  effect.run()
  //返回一个方法，当调用次方法时执行effect.stop()清空副作用
  return () => {
    effect.stop()
  }
}

export const watch = (source, cb, options: { immediate?: boolean } = {}) => {
  //source可以是一个响应式对象，也可以是一个函数
  let getter
  if (typeof source === 'function') {
    //如果是函数，直接赋值给getter
    getter = source
  } else {
    //如果是对象，就执行traverse方法深层读取对象上的每个属性（在vue源码中会有一个deep选项）
    getter = () => traverse(source)
  }
  let oldValue, newValue
  const job = () => {
    newValue = runner()
    //在scheduler中执行用户传入回调，就实现了在source发生变化时触发回调
    cb(newValue, oldValue)
    oldValue = newValue
  }
  const runner = effect(() => {
    //在effect中执行getter方法并返回执行结果，这样进行依赖收集的同时还能将返回结果赋值给newValue
    return getter()
  }, {
    lazy: true,
    scheduler: job
  })
  //如果为立即执行的watch，就先执行一次job
  if(options.immediate){
    job()
  }else{
    oldValue = runner()
  }
}

//定义一个traverse函数递归地读取对象上的每个属性，从而当任意属性发生变化时都能触发effect
function traverse(value: unknown, seen = new Set()) {
  if (typeof value !== 'object' || value === null || seen.has(value)) {
    return
  }
  //将value添加到seen中，代表读取过了，避免循环引用导致的死循环
  seen.add(value)
  for (const k in value) {
    traverse(value[k], seen)
  }
  return value
}