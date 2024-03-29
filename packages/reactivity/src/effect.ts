import { extend } from '@my-simplified-vue/shared'
import { TriggerOpTypes } from './operations'

type effectOptions = {
  lazy?: boolean
  scheduler?: EffectScheduler
  onStop?: Function
}

export type EffectScheduler = (...args: any[]) => any

export const ITERATE_KEY = Symbol('')

let activeEffect //用一个全局变量表示当前get操作触发的effect
let shouldTrack: boolean
export class ReactiveEffect {
  private _fn: any
  public scheduler: EffectScheduler | undefined
  deps = []
  active = true
  onStop?: Function
  //scheduler? 表示该参数是一个可选参数
  constructor(fn, scheduler?: EffectScheduler | undefined) {
    this._fn = fn
    this.scheduler = scheduler
  }
  run() {
    //执行run方法，即this._fn()的时候会触发收集依赖track，
    // 所以在这里拦截，如果stop了(this.active === false)，就不执行activeEffect = this,避免收集依赖
    if (!this.active) {
      return this._fn()
    }
    shouldTrack = true
    activeEffect = this
    const result = this._fn() //这里_fn会触发get和track
    shouldTrack = false
    return result
  }
  stop() {
    //设置一个flag变量active，避免每次stop的时候都重复遍历deps
    if (this.active) {
      cleanupEffect(this)
      if (this.onStop) {
        this.onStop()
      }
      this.active = false
    }
  }
}

const cleanupEffect = (effect) => {
  effect.deps.forEach((dep: Set<ReactiveEffect>) => {
    dep.delete(effect)
  })
  //effect.deps中每个set都被清空了，那本身也可以清空了
  effect.deps.length = 0
}

let targetMap: Map<any, Map<any, Set<ReactiveEffect>>> = new Map() //每一个reactive对象里的每一个key都需要有一个dep容器存放effect，当key的value变化时触发effect，实现响应式
//在get操作的是触发依赖收集操作，将ReactiveEffect实例收集到一个dep容器中
export const track = (target: object, key: unknown) => {
  if (!isTracking()) return
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }
  let dep: Set<ReactiveEffect> = depsMap.get(key) as Set<ReactiveEffect>
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }
  trackEffects(dep)
}

export function trackEffects(dep) {
  if (dep.has(activeEffect)) return
  dep.add(activeEffect)
  //在ReactiveEffect上挂载一个deps属性，用于记录存有这个effect的deps容器，这样执行stop的时候可以遍历删除
  activeEffect.deps.push(dep)
}

export function isTracking() {
  //这里有个regression问题，因为activeEffect是在执行effect.run()的时候赋值的，而只要触发了get操作就会执行到这里读取activeEffect
  //在happy path单测中,只触发了get但没有执行effect，所以这时候activeEffect是undefined
  return shouldTrack && activeEffect !== undefined
}

export const trigger = (
  target: object,
  key: unknown,
  type: TriggerOpTypes,
  newValue: unknown
) => {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  let deps: (Set<ReactiveEffect> | undefined)[] = []
  const dep: Set<ReactiveEffect> = depsMap.get(key) as Set<ReactiveEffect>
  deps.push(dep)
  if (Array.isArray(target) && key === 'length') {
    //如果target是数组并且修改了数组的长度，对于索引大于等于新length的元素
    //需要把他们关联的副作用函数取出来并执行
    const newLength = Number(newValue)
    depsMap.forEach((dep, key) => {
      if (key === 'length' || key >= newLength) {
        deps.push(dep)
      }
    })
  } else {
    //如果是给对象添加/删除属性，会影响对象的遍历操作，需要额外触发遍历操作关联的副作用
    if (type === TriggerOpTypes.ADD) {
      //如果target是数组且操作类型为ADD，应该取出并执行那些与length相关的副作用函数
      if (Array.isArray(target)) {
        deps.push(depsMap.get('length'))
      } else {
        deps.push(depsMap.get(ITERATE_KEY))
      }
    } else if (type === TriggerOpTypes.DELETE) {
      deps.push(depsMap.get(ITERATE_KEY))
    }
  }

  const effects: ReactiveEffect[] = []
  for (const dep of deps) {
    if (dep) {
      effects.push(...dep)
    }
  }
  triggerEffects(new Set(effects))
}

export function triggerEffects(dep) {
  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}

export const effect = (
  fn: Function,
  option: effectOptions = { lazy: false }
) => {
  const _effect = new ReactiveEffect(fn, option.scheduler)
  //用一个extend方法将option上的熟悉拷贝到_effect上
  extend(_effect, option)
  //effect接收一个lazy选项，如果lazy为true则不立刻执行副作用
  if (!option.lazy) {
    _effect.run()
  }
  //这里注意要return的是将this绑定为_effect的run方法，不然在单元测试的上下文环境里this是undefined，执行this._fn()就会报错
  const runner: any = _effect.run.bind(_effect)
  //函数也是对象，可以添加属性，把effect挂载到runner上，用于之后执行stop
  runner.effect = _effect
  return runner
}

export const stop = (runner) => {
  runner.effect.stop()
}

export function pauseTracking() {
  shouldTrack = false
}

export function enableTracking() {
  shouldTrack = true
}
