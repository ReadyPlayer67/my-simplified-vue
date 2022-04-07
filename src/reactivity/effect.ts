class ReactiveEffect {
    private _fn: any
    constructor(fn) {
        this._fn = fn
    }
    run(){
        activeEffect = this
        this._fn()
    }
}

let targetMap = new Map() //每一个reactive对象里的每一个key都需要有一个dep容器存放effect，当key的value变化时触发effect，实现响应式
let activeEffect //用一个全局变量表示当前get操作触发的effect
//在get操作的是触发依赖收集操作，将ReactiveEffect实例收集到一个dep容器中
export const track = (target,key) => {
    let depsMap = targetMap.get(target)
    if(!depsMap){
        depsMap = new Map()
        targetMap.set(target,depsMap)
    }
    let dep = depsMap.get(key)
    if(!dep){
        dep = new Set()
        depsMap.set(key,dep)
    }
    dep.add(activeEffect)
}

export const trigger = (target,key) => {
    const dep:Set<any> = targetMap.get(target).get(key)
    for(const effect of dep){
        effect.run()
    }
}

export const effect = (fn) => {
    const _effect = new ReactiveEffect(fn)
    _effect.run()
}