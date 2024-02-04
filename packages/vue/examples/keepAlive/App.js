import { h, KeepAlive, ref } from '../../dist/my-simplified-vue.esm.js'
import { Foo } from './Foo.js'
import { Bob } from './Bob.js'

export const App = {
  name: 'App',
  render() {
    return h(
      // Bob,
      KeepAlive,
      {},
      {
        default: () => (this.isChange ? h(Foo) : h(() => 'bbb')),
      }
    )
  },
  setup() {
    const isChange = ref(true)
    window.isChange = isChange
    return {
      isChange,
    }
  },
}
