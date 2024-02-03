import { h, onMounted } from '../../dist/my-simplified-vue.esm.js'

export const Foo = {
  name: 'Foo',
  setup() {
    onMounted(() => {
      console.log('mounted-----')
    })
    return {}
  },
  render() {
    return h('div', {}, '我被KeepAlive了')
  },
}
