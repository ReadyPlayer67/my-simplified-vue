import { ReactiveEffect } from "../../reactivity/src/effect"
import { queuePreFlushCb } from "./scheduler"

export function watchEffect(source){
  function job(){
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
  function getter(){
    //之后响应式变量变化时触发getter方法，进而执行cleanup
    //这样就实现了初始化effect时不执行cleanup，之后每次响应式发生变化再执行
    if(cleanup){
      cleanup()
    }
    source(onCleanup)
  }
  const effect = new ReactiveEffect(getter,() => {
    queuePreFlushCb(job)
  })
  effect.run()
  //返回一个方法，当调用次方法时执行effect.stop()清空副作用
  return () => {
    effect.stop()
  }
}