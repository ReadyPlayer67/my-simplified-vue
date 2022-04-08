type effectOptions = {
    scheduler?: Function;
};

class ReactiveEffect {
    private _fn: any
    public scheduler: Function|undefined
    //scheduler? 表示该参数是一个可选参数
    constructor(fn,scheduler?:Function|undefined) {
        this._fn = fn
        this.scheduler = scheduler
    }
    run(){
        activeEffect = this
        return this._fn()
    }
}

let targetMap:Map<any,Map<string,Set<ReactiveEffect>>> = new Map() //每一个reactive对象里的每一个key都需要有一个dep容器存放effect，当key的value变化时触发effect，实现响应式
let activeEffect //用一个全局变量表示当前get操作触发的effect
//在get操作的是触发依赖收集操作，将ReactiveEffect实例收集到一个dep容器中
export const track = (target,key) => {
    let depsMap = targetMap.get(target)
    if(!depsMap){
        depsMap = new Map()
        targetMap.set(target,depsMap)
    }
    let dep:Set<ReactiveEffect> = depsMap.get(key) as Set<ReactiveEffect>
    if(!dep){
        dep = new Set()
        depsMap.set(key,dep)
    }
    dep.add(activeEffect)
}

export const trigger = (target,key) => {
    const dep:Set<ReactiveEffect> = targetMap.get(target)!.get(key) as Set<ReactiveEffect>
    for(const effect of dep){
        if(effect.scheduler){
            effect.scheduler()
        }else{
            effect.run()
        }
    }
}

export const effect = (fn:Function,option:effectOptions = {}) => {
    const _effect = new ReactiveEffect(fn,option.scheduler)
    _effect.run()
    //这里注意要return的是将this绑定为_effect的run方法，不然在单元测试的上下文环境里this是undefined，会报错
    return _effect.run.bind(_effect)
}