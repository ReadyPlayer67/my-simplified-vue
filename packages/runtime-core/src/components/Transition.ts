import { RendererElement } from '../renderer'
import { VNode } from '../vnode'

export interface TransitionHooks<HostElement = RendererElement> {
  beforeEnter(el: HostElement): void
  enter(el: HostElement): void
  leave(el: HostElement, remove: () => void): void
}

export const Transition = {
  name: 'Transition',
  setup(props, { slots }) {
    return () => {
      const children = slots.default()
      if (children.length > 1) {
        console.warn(`<transition>组件只能有一个子节点`)
        return
      }
      const child: VNode = children[0]
      child.transition = {
        beforeEnter(el) {
          el.classList.add('v-enter-from')
          el.classList.add('v-enter-active')
        },
        enter(el) {
          requestAnimationFrame(() => {
            el.classList.remove('v-enter-from')
            el.classList.add('v-enter-to')
            el.addEventListener('transitionend', () => {
              el.classList.remove('v-enter-to')
              el.classList.remove('v-enter-active')
            })
          })
        },
        leave(el, remove) {
          el.classList.add('v-leave-from')
          el.classList.add('v-leave-active')
          //强制浏览器重排，使leave-from的样式生效
          document.body.offsetHeight
          requestAnimationFrame(() => {
            el.classList.remove('v-leave-from')
            el.classList.add('v-leave-to')
            el.addEventListener('transitionend', () => {
              el.classList.remove('v-leave-to')
              el.classList.remove('v-leave-active')
              remove()
            })
          })
        },
      }
      return child
    }
  },
}
