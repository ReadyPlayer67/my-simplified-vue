// import { h } from '../../dist/vue.esm-browser.js'
import { h } from '../../dist/my-simplified-vue.esm.js'

export const Loading = {
  name: 'Loading',
  render() {
    return h(
      'div',
      {
        id: 'loading',
      },
      'loading...'
    )
  },
}