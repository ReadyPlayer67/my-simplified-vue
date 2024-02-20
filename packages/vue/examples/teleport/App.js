import { h, Teleport, ref } from '../../dist/my-simplified-vue.esm.js'

export const App = {
  name: 'App',
  render() {
    return h('div', {}, [
      h(Teleport, { to: 'body' }, [h('p', {}, 'Teleport')]),
    ])
  },
}
