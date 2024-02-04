import { h } from '../../dist/my-simplified-vue.esm.js'
import { renderSlots } from '../../dist/my-simplified-vue.esm.js'

export const Bob = {
  name: 'Bob',
  render() {
    return h('div', {}, [renderSlots(this.$slots, 'default')])
  },
}
