import { h, Transition } from '../../dist/my-simplified-vue.esm.js'

export const App = {
  name: 'App',
  render() {
    return h('div', {}, [
      h(
        Transition,
        {},
        {
          default: () => h('div', { class: 'box' }, ''),
        }
      ),
    ])
  },
}
