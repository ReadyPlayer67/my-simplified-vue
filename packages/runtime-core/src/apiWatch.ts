import { ReactiveEffect } from "../../reactivity/src/effect"
import { queuePreFlushCb } from "./scheduler"

export function watchEffect(fn){
  function job(){
    effect.run()
  }
  const effect = new ReactiveEffect(fn,() => {
    queuePreFlushCb(job)
  })
  effect.run()
}