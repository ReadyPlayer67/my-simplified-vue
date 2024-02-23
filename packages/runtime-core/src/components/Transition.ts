export const Transition = {
  name: 'Transition',
  setup(props, { slots }) {
    return () => {
      const children = slots.default()
      children.transition = {
        beforeEnter(el) {},
        enter(el) {},
        leave(el, remove) {},
      }
      return children
    }
  },
}
