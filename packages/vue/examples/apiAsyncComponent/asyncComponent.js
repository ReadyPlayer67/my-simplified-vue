import { h } from '../../dist/my-simplified-vue.esm.js'

export default {
  name: 'asyncComponent',
  render() {
    return h(
      'div',
      {
        id: 'async',
      },
      'this is an async component!'
    )
  },
}