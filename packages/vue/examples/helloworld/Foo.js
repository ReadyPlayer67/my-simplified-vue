// import { h } from '../../dist/vue.esm-browser.js'
import { h } from '../../dist/my-simplified-vue.esm.js'

export const Foo = {
  name: 'Foo',
  setup(props) {
    //props是shallowReadonly的
    props.count++
  },
  render() {
    return h('div', {}, 'foo:' + this.count)
  },
}
