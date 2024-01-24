import { h, defineAsyncComponent } from '../../dist/vue.esm-browser.js'

export const App = {
  name: 'App',
  render() {
    return h(
      'div',
      {
        id: 'root',
      },
      [h(defineAsyncComponent(() => import('./asyncComponent.js')))]
    )
  },
  // setup() {
  //   return {}
  // },
}
