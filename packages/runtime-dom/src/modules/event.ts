interface Invoker extends EventListener {
  value: EventValue
}

//事件有可能是一个函数，也有可能是一组函数
type EventValue = Function | Function[]

const veiKey = Symbol('_vei')
//定义一个处理事件的方法
export function patchEvent(
  el: Element & { [veiKey]: Record<string, Invoker | undefined> },
  key: string,
  prevVal: EventValue | null,
  nextVal: EventValue | null
) {
  const invokers = el[veiKey] || (el[veiKey] = {})
  const existingInvoker = invokers[key]
  if (nextVal && existingInvoker) {
    //更新绑定事件
    existingInvoker.value = nextVal
  } else {
    const name = key.slice(2).toLowerCase()
    if (nextVal) {
      //新增绑定事件
      const invoker = (invokers[key] = createInvoker(nextVal))
      el.addEventListener(name, invoker)
    } else if (existingInvoker) {
      //移除绑定事件
      el.removeEventListener(name, existingInvoker)
      invokers[key] = undefined
    }
  }
}

function createInvoker(initialValue: EventValue) {
  const invoker: Invoker = (e: Event) => {
    if (Array.isArray(invoker.value)) {
      invoker.value.forEach((fn) => fn(e))
    } else {
      invoker.value(e)
    }
  }
  invoker.value = initialValue
  return invoker
}
