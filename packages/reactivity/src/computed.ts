import { ReactiveEffect } from './effect'

class ComputedRefImpl {
  //设置一个变量控制是否读取缓存
  private _dirty: boolean = true
  private _value: any
  private _effect: ReactiveEffect
  constructor(getter) {
    //这里需要创建一个ReactiveEffect，否则在依赖发生变化触发trigger的时候targetMap是空，会报错
    this._effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
      }
    })
  }

  get value() {
    //如果_dirty为true，表示依赖发生变化，需要重新执行getter获取结果赋值给_value
    //并且将_dirty设置成false，下次来的时候读的就是缓存的_value了
    if (this._dirty) {
      this._dirty = false
      //这里修改成_effect.run()，执行的就是用户传入的getter方法，并且还会赋值给activeEffect(详见effect.ts)
      //这样targetMap就有值了，trigger的时候不会报错
      this._value = this._effect.run()
    }
    return this._value
  }
}

export const computed = (getter) => {
  //初始化的时候只是传入了getter方法，并不会去执行getter方法
  return new ComputedRefImpl(getter)
}
