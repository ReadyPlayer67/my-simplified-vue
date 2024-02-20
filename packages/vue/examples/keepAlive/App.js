import { h, KeepAlive, ref } from '../../dist/my-simplified-vue.esm.js'
import { Foo } from './Foo.js'
import { Bob } from './Bob.js'

export const App = {
  name: 'App',
  render() {
    return h(
      //使用一个普通组件对比KeepAlive组件，观察onMount生命周期是否执行
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
