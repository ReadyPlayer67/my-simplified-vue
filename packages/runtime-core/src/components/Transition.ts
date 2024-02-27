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
    const { name = 'v' } = props
    return () => {
      const children = slots.default()
      if (children.length > 1) {
        console.warn(`<transition>组件只能有一个子节点`)
        return
      }
      const child: VNode = children[0]
      child.transition = {
        beforeEnter(el) {
          el.classList.add(`${name}-enter-from`)
          el.classList.add(`${name}-enter-active`)
        },
        enter(el) {
          requestAnimationFrame(() => {
            el.classList.remove(`${name}-enter-from`)
            el.classList.add(`${name}-enter-to`)
            el.addEventListener('transitionend', () => {
              el.classList.remove(`${name}-enter-to`)
              el.classList.remove(`${name}-enter-active`)
            })
          })
        },
        leave(el, remove) {
          el.classList.add(`${name}-leave-from`)
          el.classList.add(`${name}-leave-active`)
          //强制浏览器重排，使leave-from的样式生效
          document.body.offsetHeight
          requestAnimationFrame(() => {
            el.classList.remove(`${name}-leave-from`)
            el.classList.add(`${name}-leave-to`)
            el.addEventListener('transitionend', () => {
              el.classList.remove(`${name}-leave-to`)
              el.classList.remove(`${name}-leave-active`)
              remove()
            })
          })
        },
      }
      return child
    }
  },
}
