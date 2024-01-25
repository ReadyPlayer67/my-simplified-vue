// import { h, ref } from '../../dist/vue.esm-browser.js'
import { h, ref } from '../../dist/my-simplified-vue.esm.js'

export const App = {
  name: 'App',
  render() {
    const self = this
    const com1 = h(() => 'aaa')
    const com2 = h(() => 'bbb')
    return self.isChange === true ? com1 : com2
  },
  setup() {
    const isChange = ref(true)
    window.isChange = isChange
    return {
      isChange,
    }
  },
}
