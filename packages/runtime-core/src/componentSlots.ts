import { ShapeFlags } from '@my-simplified-vue/shared'

export function initSlots(instance, children) {
  if (instance.vnode.shapeFlag & ShapeFlags.SLOT_CHILDREN) {
    normalizeObjectSlots(children, instance.slots)
  }
}

function normalizeObjectSlots(children, slots) {
  for (const key in children) {
    const value = children[key]
    //父组件上的具名插槽是Record<string,function>
    slots[key] = (props) => {
      //value就是父组件写的函数({age}) => h('p', {}, 'header' + age)
      return normalizeSlotValue(value(props))
    }
  }
}

function normalizeSlotValue(value) {
  return Array.isArray(value) ? value : [value]
}
