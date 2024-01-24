// import { h, defineAsyncComponent } from '../../dist/vue.esm-browser.js'
import { h, defineAsyncComponent } from '../../dist/my-simplified-vue.esm.js'

export const App = {
  name: 'App',
  render() {
    return h(
      'div',
      {
        id: 'root',
      },
      [
        h(() => 'loading...')
      ]
    )
  },
  // setup() {
  //   return {}
  // },
}
