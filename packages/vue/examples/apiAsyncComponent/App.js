import { h, defineAsyncComponent } from '../../dist/my-simplified-vue.esm.js'
import { Loading } from './loading.js'
// import { h, defineAsyncComponent } from '../../dist/vue.esm-browser.js'

export const App = {
  name: 'App',
  render() {
    return h(
      'div',
      {
        id: 'root',
      },
      [
        h(
          defineAsyncComponent({
            loader: () => import('./asyncComponent.js'),
            // loader: () =>
            //   new Promise((resolve) => {
            //     setTimeout(() => resolve(() => 'hello'), 500)
            //   }),
            loadingComponent: Loading,
            // loadingComponent: () => 'loading...',
          })
        ),
      ]
    )
  },
}
