import { effect } from "./effect"

export const watch = (source, cb) => {
  //source可以是一个响应式对象，也可以是一个函数
  let getter
  if (typeof source === 'function') {
    //如果是函数，直接赋值给getter
    getter = source
  } else {
    //如果是对象，就执行traverse方法读取对象上的每个属性
    getter = () => traverse(source)
  }
  effect(() => {
    //在effect中执行getter方法，进行依赖收集
    () => getter()
  },{
    scheduler(){
      //在scheduler中执行用户传入回调，就实现了在source发生变化时触发回调
      cb()
    }
  })
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