import { h, ref, Transition } from '../../dist/my-simplified-vue.esm.js'

export const App = {
  name: 'App',
  setup() {
    const isChange = ref(true)
    window.isChange = isChange
    return {
      isChange,
    }
  },
  render() {
    return h('div', {}, [
      h(
        Transition,
        { name: 'fade' },
        {
          default: () =>
            this.isChange
              ? h('div', { class: 'box' }, '')
              : h(() => '替代内容'),
        }
      ),
    ])
  },
}
