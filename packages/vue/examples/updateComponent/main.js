import { createApp } from '../../dist/my-simplified-vue.esm.js'
// import { createApp } from '../../dist/vue.esm-browser.js'
import { App } from './App.js'

const rootContainer = document.querySelector('#app')
createApp(App).mount(rootContainer)
